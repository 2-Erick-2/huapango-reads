import { baseKeymap, setBlockType, toggleMark } from "prosemirror-commands";
import { history, redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import type { Node as PMNode } from "prosemirror-model";
import { EditorState, type Command, type EditorState as State } from "prosemirror-state";
import { EditorView, type NodeView } from "prosemirror-view";
import { For, Show, createSignal, onCleanup, onMount, type JSX } from "solid-js";
import { enter } from "~/lib/editor/comandos";
import { docToPieza, piezaToDoc } from "~/lib/editor/convert";
import { markType, nodeType, schema } from "~/lib/editor/schema";
import type { Pieza } from "~/lib/libro/types";
import { validatePieza, type Issue } from "~/lib/libro/validate";
import { ErrorPanel, guardarVersion, huellaDe, urlsDeImagenes } from "~/lib/panel/nube";
import { THEMES } from "~/lib/reader/types";
import { HistorialModal } from "./HistorialModal";
import { InsertarImagenModal, type ImagenInsertada } from "./InsertarImagenModal";
import { PreviewModal } from "./PreviewModal";

const draftKey = (slug: string, nube: boolean) => `hr:panel:${nube ? "nube" : "draft"}:${slug}`;

/** Imagen dentro del editor: se muestra tal como la verá el lector, con ajuste de tamaño o borrado. */
class ImageView implements NodeView {
  dom: HTMLElement;
  constructor(
    node: PMNode,
    url: (asset: string) => string,
    onAncho: (widthPct: number) => void,
    onQuitar: () => void,
  ) {
    const { asset, crop, widthPct, role, width, height } = node.attrs as {
      asset: string;
      crop: { from: number; to: number } | null;
      widthPct: number | null;
      role: string;
      width: number;
      height: number;
    };
    const figure = document.createElement("figure");
    figure.className = "pm-image";
    figure.dataset["role"] = role;
    figure.contentEditable = "false";
    const img = document.createElement("img");
    img.src = url(asset);
    img.alt = "";
    img.draggable = false;
    if (crop) {
      const span = crop.to - crop.from;
      const box = document.createElement("div");
      box.className = "pm-image-crop";
      box.style.width = `${widthPct ?? 100}%`;
      box.style.aspectRatio = `${width} / ${height * span}`;
      img.style.cssText = `position:absolute;left:0;width:100%;height:${100 / span}%;top:${-(crop.from / span) * 100}%`;
      box.append(img);
      figure.append(box);
    } else {
      img.style.width = `${role === "portadilla" ? 100 : (widthPct ?? 100)}%`;
      figure.append(img);
    }

    const bar = document.createElement("div");
    bar.className =
      "pm-image-tools mt-2 inline-flex flex-wrap items-center justify-center gap-1.5 rounded-sm border border-linea bg-superficie px-2.5 py-1.5";
    if (role !== "portadilla") {
      for (const pct of [100, 60, 35]) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = `${pct} %`;
        const activo = (widthPct ?? 100) === pct;
        btn.className = `rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${
          activo
            ? "border-acento-borde bg-acento-tenue text-tinta"
            : "border-linea-fuerte text-tinta-suave hover:border-borde-hover"
        }`;
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          onAncho(pct);
        });
        bar.append(btn);
      }
    }
    const quitar = document.createElement("button");
    quitar.type = "button";
    quitar.textContent = "Quitar";
    quitar.className =
      "rounded-sm border border-error px-2 py-0.5 text-[11px] font-semibold text-acento";
    quitar.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onQuitar();
    });
    bar.append(quitar);
    figure.append(bar);
    this.dom = figure;
  }
  stopEvent(e: Event) {
    return e.target instanceof HTMLElement && e.target.closest(".pm-image-tools") !== null;
  }
  ignoreMutation() {
    return true;
  }
}

interface ToolbarState {
  strong: boolean;
  em: boolean;
  smallCaps: boolean;
  block: string;
  indent: boolean;
  dropCap: boolean;
  canUndo: boolean;
}

const emptyToolbar: ToolbarState = {
  strong: false,
  em: false,
  smallCaps: false,
  block: "",
  indent: false,
  dropCap: false,
  canUndo: false,
};

function markActive(state: State, name: string): boolean {
  const type = markType(name);
  const { from, $from, to, empty } = state.selection;
  return empty
    ? Boolean(type.isInSet(state.storedMarks ?? $from.marks()))
    : state.doc.rangeHasMark(from, to, type);
}

function toolbarOf(state: State): ToolbarState {
  const parent = state.selection.$from.parent;
  const block =
    parent.type.name === "heading" ? `heading${String(parent.attrs["level"])}` : parent.type.name;
  return {
    strong: markActive(state, "strong"),
    em: markActive(state, "em"),
    smallCaps: markActive(state, "smallCaps"),
    block,
    indent: parent.type.name === "paragraph" && Boolean(parent.attrs["indent"]),
    dropCap: parent.type.name === "paragraph" && Boolean(parent.attrs["dropCap"]),
    canUndo: undo(state),
  };
}

/** Cambia un atributo booleano del párrafo donde está el cursor (sangría, capitular). */
function toggleAttr(name: "indent" | "dropCap"): Command {
  return (state, dispatch) => {
    const { $from } = state.selection;
    if ($from.parent.type.name !== "paragraph") return false;
    if (dispatch) {
      const attrs = { ...$from.parent.attrs, [name]: !$from.parent.attrs[name] };
      dispatch(state.tr.setNodeMarkup($from.before(), undefined, attrs));
    }
    return true;
  };
}

function Tool(props: {
  label: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: JSX.Element;
}) {
  return (
    <button
      type="button"
      title={props.title}
      aria-label={props.label}
      aria-pressed={props.active === undefined ? undefined : props.active}
      disabled={props.disabled}
      // mousedown con preventDefault: el botón no le quita el foco (ni la selección) al editor
      onMouseDown={(e) => e.preventDefault()}
      onClick={props.onClick}
      class="flex h-9 min-w-9 items-center justify-center rounded-sm border px-2 text-[13px] font-semibold transition-colors disabled:opacity-30"
      classList={{
        "border-acento-borde bg-acento-fondo/20 text-tinta": props.active === true,
        "border-linea-fuerte text-tinta-2 hover:border-borde-hover": props.active !== true,
      }}
    >
      {props.children}
    </button>
  );
}

/**
 * Editor de una pieza (ADR 0018 y 0021): cada bloque canónico es un nodo de ProseMirror. Revisa en
 * vivo con `validatePieza` y guarda un borrador de respaldo en este navegador.
 * - Con `nube`, "Guardar versión" (o Ctrl+S) guarda una versión nueva en la base de la editorial.
 * - Sin `nube` (libros de la demostración), se puede descargar la pieza resultante.
 */
export function PieceEditor(props: {
  obra: string;
  pieza: Pieza;
  assetUrl: (name: string) => string;
  nube?: { obraId: string; piezaId: string; numero: number };
}) {
  let host!: HTMLDivElement;
  let view: EditorView | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let draftTimer: ReturnType<typeof setTimeout> | undefined;

  const initialAssets = props.pieza.blocks.flatMap((b) => (b.type === "image" ? [b.asset] : []));
  const [extraUrls, setExtraUrls] = createSignal<Record<string, string>>({});
  const urlDe = (name: string) => extraUrls()[name] ?? props.assetUrl(name);
  const assets = () => new Set([...initialAssets, ...Object.keys(extraUrls())]);
  const [current, setCurrent] = createSignal<Pieza>(props.pieza);
  const [issues, setIssues] = createSignal<Issue[]>([]);
  const [tool, setTool] = createSignal<ToolbarState>(emptyToolbar);
  const [dirty, setDirty] = createSignal(false);
  const [restored, setRestored] = createSignal(false);
  const [preview, setPreview] = createSignal<Pieza | null>(null);
  const [modalImagen, setModalImagen] = createSignal(false);
  const [modalHistorial, setModalHistorial] = createSignal(false);
  const [avisoDemoImagen, setAvisoDemoImagen] = createSignal(false);
  const [notaPendiente, setNotaPendiente] = createSignal<string | null>(null);
  const enNube = props.nube !== undefined;
  const clave = draftKey(props.pieza.slug, enNube);
  // Se compara contra la pieza tal como la escribe el editor (mismo orden interno de sus datos):
  // así, abrir una pieza sin tocarla nunca aparece como "cambios sin guardar".
  const [guardada, setGuardada] = createSignal(
    huellaDe(docToPieza(piezaToDoc(props.pieza), props.pieza)),
  );
  const [numero, setNumero] = createSignal(props.nube?.numero ?? 0);
  const [guardando, setGuardando] = createSignal(false);
  const [errorGuardar, setErrorGuardar] = createSignal<string | null>(null);
  const sinGuardar = () => enNube && huellaDe(current()) !== guardada();

  const analyze = (doc: PMNode) => {
    const next = docToPieza(doc, props.pieza);
    setCurrent(next);
    setIssues(validatePieza(next, assets()));
  };

  const insertarImagen = (img: ImagenInsertada) => {
    setExtraUrls((prev) => ({ ...prev, [img.asset]: img.url }));
    setModalImagen(false);
    if (!view) return;
    const { state } = view;
    const pos = state.selection.$from.after(1);
    const nodo = nodeType("image").create({
      asset: img.asset,
      alt: img.alt,
      role: img.role,
      decorative: img.decorative,
      widthPct: img.widthPct,
      width: img.width,
      height: img.height,
      crop: null,
      page: null,
    });
    view.dispatch(state.tr.insert(pos, nodo));
    analyze(view.state.doc);
    view.focus();
  };

  const restaurarVersion = (pieza: Pieza, numeroRestaurado: number) => {
    if (!view) return;
    const nuevoDoc = piezaToDoc(pieza);
    view.dispatch(view.state.tr.replaceWith(0, view.state.doc.content.size, nuevoDoc.content));
    setNotaPendiente(`Restaurada desde la versión ${numeroRestaurado}`);
    analyze(view.state.doc);
    if (enNube) {
      const faltantes: string[] = [];
      for (const b of pieza.blocks) {
        if (b.type === "image" && !urlDe(b.asset)) faltantes.push(b.asset);
      }
      if (faltantes.length > 0) {
        void urlsDeImagenes(props.obra, faltantes)
          .then((nuevas) => {
            setExtraUrls((prev) => ({ ...prev, ...nuevas }));
            if (view) {
              view.dispatch(view.state.tr.setMeta("addToHistory", false));
              analyze(view.state.doc);
            }
          })
          .catch(() => undefined);
      }
    }
    view.focus();
  };

  const guardar = async () => {
    const nube = props.nube;
    if (!nube || !view || guardando()) return;
    const pieza = docToPieza(view.state.doc, props.pieza);
    setCurrent(pieza);
    if (huellaDe(pieza) === guardada()) return;
    setGuardando(true);
    setErrorGuardar(null);
    try {
      setNumero(await guardarVersion(nube.piezaId, pieza, notaPendiente()));
      setNotaPendiente(null);
      setGuardada(huellaDe(pieza));
      setRestored(false);
      try {
        localStorage.removeItem(clave);
      } catch {
        // sin almacenamiento: nada que limpiar
      }
    } catch (error) {
      setErrorGuardar(
        error instanceof ErrorPanel ? error.message : "No se pudo guardar. Inténtalo de nuevo.",
      );
    } finally {
      setGuardando(false);
    }
  };

  const run = (command: Command) => {
    if (!view) return;
    command(view.state, view.dispatch, view);
    view.focus();
  };

  const startDoc = (): PMNode => {
    try {
      const raw = localStorage.getItem(clave);
      if (raw) {
        const doc = schema.nodeFromJSON(JSON.parse(raw));
        doc.check();
        setRestored(true);
        setDirty(true);
        return doc;
      }
    } catch {
      // borrador dañado o almacenamiento bloqueado: se ignora y se abre el original
    }
    return piezaToDoc(props.pieza);
  };

  onMount(() => {
    const doc = startDoc();
    const state = EditorState.create({
      doc,
      plugins: [
        history(),
        keymap({
          "Mod-z": undo,
          "Mod-y": redo,
          "Shift-Mod-z": redo,
          "Mod-b": toggleMark(markType("strong")),
          "Mod-i": toggleMark(markType("em")),
          Enter: enter,
          "Mod-s": () => {
            void guardar();
            return true;
          },
        }),
        keymap(baseKeymap),
      ],
    });
    view = new EditorView(host, {
      state,
      attributes: {
        "aria-label": `Texto de ${props.pieza.title}`,
        spellcheck: "true",
        lang: "es-MX",
      },
      nodeViews: {
        image: (node, pmView, getPos) =>
          new ImageView(
            node,
            urlDe,
            (widthPct) => {
              const pos = getPos();
              if (pos === undefined) return;
              const actual = pmView.state.doc.nodeAt(pos);
              if (!actual) return;
              pmView.dispatch(
                pmView.state.tr.setNodeMarkup(pos, undefined, { ...actual.attrs, widthPct }),
              );
            },
            () => {
              const pos = getPos();
              if (pos === undefined) return;
              const actual = pmView.state.doc.nodeAt(pos);
              if (!actual) return;
              pmView.dispatch(pmView.state.tr.delete(pos, pos + actual.nodeSize));
            },
          ),
      },
      dispatchTransaction(tr) {
        if (!view) return;
        const next = view.state.apply(tr);
        view.updateState(next);
        setTool(toolbarOf(next));
        if (tr.docChanged) {
          setDirty(true);
          clearTimeout(timer);
          timer = setTimeout(() => analyze(next.doc), 200);
          clearTimeout(draftTimer);
          draftTimer = setTimeout(() => {
            try {
              localStorage.setItem(clave, JSON.stringify(next.doc.toJSON()));
            } catch {
              // sin almacenamiento: no hay borrador, el editor sigue funcionando
            }
          }, 600);
        }
      },
    });
    setTool(toolbarOf(view.state));
    analyze(view.state.doc);
    if (enNube) {
      const faltantes: string[] = [];
      doc.forEach((n) => {
        if (n.type.name === "image") {
          const a = String(n.attrs["asset"] ?? "");
          if (a && !urlDe(a)) faltantes.push(a);
        }
      });
      if (faltantes.length > 0) {
        void urlsDeImagenes(props.obra, faltantes)
          .then((nuevas) => {
            setExtraUrls((prev) => ({ ...prev, ...nuevas }));
            if (view) {
              // Refresca el nodo de imagen con su URL firmada recuperada del borrador
              view.dispatch(view.state.tr.setMeta("addToHistory", false));
              analyze(view.state.doc);
            }
          })
          .catch(() => undefined);
      }
    }
    const avisarAlSalir = (e: BeforeUnloadEvent) => {
      if (sinGuardar()) e.preventDefault();
    };
    window.addEventListener("beforeunload", avisarAlSalir);
    onCleanup(() => {
      clearTimeout(timer);
      clearTimeout(draftTimer);
      window.removeEventListener("beforeunload", avisarAlSalir);
      view?.destroy();
    });
  });

  const download = () => {
    const blob = new Blob([`${JSON.stringify(current(), null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${props.pieza.slug}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const discard = () => {
    try {
      localStorage.removeItem(clave);
    } catch {
      // nada que borrar
    }
    window.location.reload();
  };

  const errors = () => issues().filter((i) => i.level === "error");
  const warnings = () => issues().filter((i) => i.level === "warning");
  const theme = THEMES.bond;

  return (
    <div class="mx-auto flex w-full max-w-[1500px] flex-1 flex-col gap-4 px-4 py-6 sm:px-8">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex flex-col gap-1">
          <p class="m-0 text-[11px] font-bold uppercase tracking-[0.24em] text-acento">
            {props.pieza.kind === "libro"
              ? "El libro"
              : props.pieza.kind === "ensayo"
                ? "Ensayo"
                : "Complemento"}
          </p>
          <h1 class="m-0 font-serif text-3xl font-light tracking-tight">{props.pieza.title}</h1>
        </div>
        <div class="flex flex-wrap items-center gap-3">
          <span
            class="text-[13px] text-tinta-suave"
            aria-live="polite"
            data-testid="estado-guardado"
          >
            {enNube
              ? guardando()
                ? "Guardando…"
                : sinGuardar()
                  ? "Cambios sin guardar"
                  : `Versión ${numero()} guardada`
              : dirty()
                ? "Tu avance está guardado en este equipo"
                : "Sin cambios"}
          </span>
          <Show when={enNube}>
            <button
              type="button"
              onClick={() => setModalHistorial(true)}
              class="h-10 rounded-sm border border-linea-fuerte px-4 text-[13px] font-semibold text-tinta-2 hover:border-borde-hover"
            >
              Historial
            </button>
          </Show>
          <button
            type="button"
            onClick={() => setPreview(current())}
            class="h-10 rounded-sm border border-borde px-5 text-[13px] font-semibold text-tinta hover:border-borde-hover"
          >
            Vista previa completa
          </button>
          <Show
            when={enNube}
            fallback={
              <button
                type="button"
                onClick={download}
                class="h-10 rounded-sm bg-acento-fondo px-5 text-[13px] font-semibold text-white hover:bg-acento-fondo-hover"
              >
                Descargar esta pieza
              </button>
            }
          >
            <button
              type="button"
              onClick={() => void guardar()}
              disabled={guardando() || !sinGuardar()}
              title="Guardar versión (Ctrl+S)"
              class="h-10 rounded-sm bg-acento-fondo px-5 text-[13px] font-semibold text-white hover:bg-acento-fondo-hover disabled:opacity-40"
            >
              {guardando() ? "Guardando…" : "Guardar versión"}
            </button>
          </Show>
        </div>
      </div>

      <Show when={errorGuardar()}>
        {(m) => (
          <p role="alert" class="m-0 rounded-sm border border-error px-4 py-3 text-sm text-acento">
            {m()}
          </p>
        )}
      </Show>

      <Show when={restored()}>
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-aviso-borde bg-superficie px-4 py-3 text-sm text-tinta-2">
          <span>
            {enNube
              ? "Recuperamos cambios que no habías guardado. Guárdalos para no perderlos."
              : "Se recuperó un borrador de una sesión anterior."}
          </span>
          <button
            type="button"
            onClick={discard}
            class="font-semibold text-acento underline underline-offset-4"
          >
            Descartar y volver al original
          </button>
        </div>
      </Show>

      {/* Barra de herramientas */}
      <div
        role="toolbar"
        aria-label="Formato"
        class="flex flex-wrap items-center gap-2 rounded-sm border border-linea bg-superficie p-2"
      >
        <Tool
          label="Deshacer"
          title="Deshacer (Ctrl+Z)"
          disabled={!tool().canUndo}
          onClick={() => run(undo)}
        >
          ↶
        </Tool>
        <Tool label="Rehacer" title="Rehacer (Ctrl+Y)" onClick={() => run(redo)}>
          ↷
        </Tool>
        <span class="mx-1 h-6 w-px bg-control" aria-hidden="true" />
        <Tool
          label="Párrafo"
          title="Texto normal"
          active={tool().block === "paragraph"}
          onClick={() => run(setBlockType(nodeType("paragraph")))}
        >
          Párrafo
        </Tool>
        <Tool
          label="Título 1"
          title="Título grande"
          active={tool().block === "heading1"}
          onClick={() => run(setBlockType(nodeType("heading"), { level: 1 }))}
        >
          T1
        </Tool>
        <Tool
          label="Título 2"
          title="Título de capítulo"
          active={tool().block === "heading2"}
          onClick={() => run(setBlockType(nodeType("heading"), { level: 2 }))}
        >
          T2
        </Tool>
        <Tool
          label="Etiqueta pequeña"
          title="Etiqueta sobre un título (p. ej. «Capítulo I»)"
          active={tool().block === "heading3"}
          onClick={() => run(setBlockType(nodeType("heading"), { level: 3 }))}
        >
          T3
        </Tool>
        <Tool
          label="Firma"
          title="Firma al final de un texto"
          active={tool().block === "byline"}
          onClick={() => run(setBlockType(nodeType("byline")))}
        >
          Firma
        </Tool>
        <span class="mx-1 h-6 w-px bg-control" aria-hidden="true" />
        <Tool
          label="Negrita"
          title="Negrita (Ctrl+B)"
          active={tool().strong}
          onClick={() => run(toggleMark(markType("strong")))}
        >
          <strong>N</strong>
        </Tool>
        <Tool
          label="Cursiva"
          title="Cursiva (Ctrl+I)"
          active={tool().em}
          onClick={() => run(toggleMark(markType("em")))}
        >
          <em>C</em>
        </Tool>
        <Tool
          label="Versalitas"
          title="Versalitas"
          active={tool().smallCaps}
          onClick={() => run(toggleMark(markType("smallCaps")))}
        >
          <span style={{ "font-variant-caps": "small-caps" }}>Aa</span>
        </Tool>
        <span class="mx-1 h-6 w-px bg-control" aria-hidden="true" />
        <Tool
          label="Sangría"
          title="Sangría de primera línea"
          active={tool().indent}
          disabled={tool().block !== "paragraph"}
          onClick={() => run(toggleAttr("indent"))}
        >
          ⇥
        </Tool>
        <Tool
          label="Capitular"
          title="Capitular en este párrafo"
          active={tool().dropCap}
          disabled={tool().block !== "paragraph"}
          onClick={() => run(toggleAttr("dropCap"))}
        >
          A
        </Tool>
        <span class="mx-1 h-6 w-px bg-control" aria-hidden="true" />
        <Tool
          label="Insertar imagen PNG"
          title="Insertar imagen PNG real"
          onClick={() => {
            if (enNube) setModalImagen(true);
            else setAvisoDemoImagen(true);
          }}
        >
          Imagen PNG
        </Tool>
      </div>

      <Show when={avisoDemoImagen()}>
        <div class="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-aviso-borde bg-superficie px-4 py-3 text-sm text-tinta-2">
          <span>
            Para insertar imágenes nuevas, primero importa o crea esta obra en la biblioteca de la
            editorial.
          </span>
          <button
            type="button"
            onClick={() => setAvisoDemoImagen(false)}
            class="font-semibold text-acento underline underline-offset-4"
          >
            Entendido
          </button>
        </div>
      </Show>

      <div class="grid min-h-0 flex-1 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Hoja de edición */}
        <div class="rounded-sm shadow-hoja" style={{ background: theme.bg }}>
          <div
            ref={host}
            class="pm-editor mx-auto min-h-[60vh] max-w-[720px] px-6 py-10 sm:px-12"
          />
        </div>

        {/* Revisión y vista previa */}
        <aside class="flex flex-col gap-4 rounded-sm border border-linea bg-superficie p-4 lg:sticky lg:top-4">
          <div class="contents">
            <dl class="m-0 grid grid-cols-3 gap-3 text-center">
              <div>
                <dt class="text-[11px] uppercase tracking-[0.16em] text-tinta-tenue">Palabras</dt>
                <dd class="m-0 font-serif text-2xl" data-testid="palabras">
                  {current().stats.words}
                </dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.16em] text-tinta-tenue">Párrafos</dt>
                <dd class="m-0 font-serif text-2xl">{current().stats.paragraphs}</dd>
              </div>
              <div>
                <dt class="text-[11px] uppercase tracking-[0.16em] text-tinta-tenue">Lectura</dt>
                <dd class="m-0 font-serif text-2xl">{current().stats.minutes} min</dd>
              </div>
            </dl>
            <div aria-live="polite" class="flex flex-col gap-2">
              <Show
                when={issues().length > 0}
                fallback={
                  <p
                    class="m-0 rounded-sm border border-linea-fuerte px-3 py-2.5 text-sm text-tinta-2"
                    data-testid="sin-problemas"
                  >
                    ✓ Todo en orden: no hay nada que corregir.
                  </p>
                }
              >
                <p class="m-0 text-sm font-semibold text-tinta" data-testid="problemas">
                  {errors().length} {errors().length === 1 ? "error" : "errores"} ·{" "}
                  {warnings().length} {warnings().length === 1 ? "aviso" : "avisos"}
                </p>
                <ul class="m-0 flex list-none flex-col gap-2 p-0">
                  <For each={issues().slice(0, 12)}>
                    {(i) => (
                      <li
                        class="rounded-sm border px-3 py-2 text-[13px] leading-snug"
                        classList={{
                          "border-error text-acento": i.level === "error",
                          "border-aviso-borde text-aviso": i.level === "warning",
                        }}
                      >
                        <span class="font-semibold">{i.level === "error" ? "Error" : "Aviso"}</span>
                        : {i.message}
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </div>
            <p class="m-0 text-xs leading-relaxed text-tinta-tenue">
              Si editas un párrafo, ese párrafo pierde la referencia a la página del libro impreso;
              los demás la conservan.
            </p>
          </div>
        </aside>
      </div>

      <Show when={preview()} keyed>
        {(snapshot) => (
          <PreviewModal pieza={snapshot} assetUrl={urlDe} onClose={() => setPreview(null)} />
        )}
      </Show>

      <Show when={modalImagen() && props.nube}>
        {(n) => (
          <InsertarImagenModal
            obraId={n().obraId}
            obraSlug={props.obra}
            onInsertar={insertarImagen}
            onClose={() => setModalImagen(false)}
          />
        )}
      </Show>

      <Show when={modalHistorial() && props.nube}>
        {(n) => (
          <HistorialModal
            piezaId={n().piezaId}
            titulo={props.pieza.title}
            numeroActual={numero()}
            onRestaurar={restaurarVersion}
            onClose={() => setModalHistorial(false)}
          />
        )}
      </Show>
    </div>
  );
}
