import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode, type CSSProperties, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';

function OptionPanel({ children, reducedMotion, placement, panelRef }: { children: ReactNode; reducedMotion: boolean | null; placement: CSSProperties; panelRef: RefObject<HTMLDivElement | null> }) {
  const present = useIsPresent();
  return <motion.div ref={panelRef} className="option-panel" style={placement} inert={!present} aria-hidden={!present} initial={{ opacity: 0, y: reducedMotion ? 0 : -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reducedMotion ? 0 : -4 }} transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>;
}

export type PickerOption = { value: string; label: string; detail?: string };
type Props = {
  label: string;
  value: string;
  options: readonly PickerOption[];
  onChange: (value: string) => void;
  searchable?: boolean;
  disabled?: boolean;
};

export default function OptionPicker({ label, value, options, onChange, searchable = false, disabled = false }: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<CSSProperties>({});
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [active, setActive] = useState(value);
  const reducedMotion = useReducedMotion();
  const visible = open && !disabled;
  const matches = options.filter(option => `${option.label} ${option.detail ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()));
  const activeIndex = Math.max(0, matches.findIndex(option => option.value === active));
  const activeOption = matches[activeIndex];
  const selected = options.find(option => option.value === value);

  function measure(): CSSProperties {
    const rect = trigger.current?.getBoundingClientRect();
    if (!rect) return {};
    const viewport = window.visualViewport;
    const width = viewport?.width ?? innerWidth;
    const height = viewport?.height ?? innerHeight;
    const offsetTop = viewport?.offsetTop ?? 0;
    const offsetLeft = viewport?.offsetLeft ?? 0;
    // A mobile keyboard or browser toolbar can push the trigger outside the
    // visual viewport. Keep the open menu inside the remaining visible area.
    const anchorTop = Math.max(offsetTop + 8, Math.min(rect.top, offsetTop + height - 8));
    const anchorBottom = Math.max(offsetTop + 8, Math.min(rect.bottom, offsetTop + height - 8));
    const above = Math.max(0, anchorTop - offsetTop - 14);
    const below = Math.max(0, offsetTop + height - anchorBottom - 14);
    const desired = Math.min(360, options.length * 64 + (searchable ? 104 : 14));
    const upwards = below < desired && above > below;
    const maxHeight = Math.min(desired, upwards ? above : below);
    const panelWidth = Math.min(rect.width, width - 16);
    return {
      width: panelWidth,
      left: Math.max(offsetLeft + 8, Math.min(rect.left, offsetLeft + width - panelWidth - 8)),
      top: upwards ? undefined : anchorBottom + 6,
      bottom: upwards ? innerHeight - anchorTop + 6 : undefined,
      maxHeight,
    };
  }

  useEffect(() => {
    if (!visible) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setOpen(false);
    };
    const reposition = (event: Event) => {
      if (event.target instanceof Node && panel.current?.contains(event.target)) return;
      setPlacement(measure());
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    window.visualViewport?.addEventListener('resize', reposition);
    window.visualViewport?.addEventListener('scroll', reposition);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
      window.visualViewport?.removeEventListener('resize', reposition);
      window.visualViewport?.removeEventListener('scroll', reposition);
    };
  // Only geometry-related option count matters for placement.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, options.length, searchable]);

  useEffect(() => {
    if (!visible || !list.current) return;
    const row = list.current.querySelector<HTMLElement>(`[data-active="true"]`);
    if (!row) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.current.scrollTop) list.current.scrollTop = top;
    else if (bottom > list.current.scrollTop + list.current.clientHeight) list.current.scrollTop = bottom - list.current.clientHeight;
  }, [visible, active, search]);

  function toggle() {
    setPlacement(measure());
    setSearch('');
    setActive(value);
    setOpen(!visible);
  }

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }

  function onKey(event: KeyboardEvent) {
    if (disabled) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      // Keep Home/End available for editing the search field.
      if (event.target instanceof HTMLInputElement && ['Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (!visible) {
        setPlacement(measure());
        setSearch('');
        setActive(value);
        setOpen(true);
      } else {
        const index = event.key === 'Home' ? 0 : event.key === 'End' ? matches.length - 1 : Math.max(0, Math.min(matches.length - 1, activeIndex + (event.key === 'ArrowDown' ? 1 : -1)));
        if (matches[index]) setActive(matches[index].value);
      }
    } else if (visible && (event.key === 'Enter' || (event.key === ' ' && !(event.target instanceof HTMLInputElement)))) {
      event.preventDefault();
      if (activeOption) choose(activeOption.value);
    }
  }

  return (
    <div className="option-picker" ref={root} onKeyDown={onKey} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget) && !panel.current?.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button ref={trigger} type="button" className="field option-trigger" role="combobox" aria-label={label} aria-expanded={visible} aria-haspopup="listbox" aria-controls={`${id}-list`} aria-activedescendant={visible && activeOption ? `${id}-option-${activeIndex}` : undefined} disabled={disabled} onClick={toggle}>
        <span>{selected?.label ?? value}</span>
        <motion.svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" animate={{ rotate: visible ? 180 : 0 }} transition={{ duration: reducedMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" /></motion.svg>
      </button>
      {createPortal(<AnimatePresence>
        {visible && <OptionPanel key="options" reducedMotion={reducedMotion} placement={placement} panelRef={panel}>
          {searchable && <div className="option-search"><input className="field" aria-label={`Search ${label.toLowerCase()}s`} aria-controls={`${id}-list`} aria-activedescendant={activeOption ? `${id}-option-${activeIndex}` : undefined} placeholder="Search fonts (optional)" value={search} maxLength={100} onChange={event => { setSearch(event.target.value.slice(0, 100)); setActive(''); }} /></div>}
          <div className="option-list" id={`${id}-list`} role="listbox" aria-label={`${label} options`} ref={list} data-lenis-prevent>
            {matches.map((option, index) => <button type="button" role="option" aria-label={option.label} aria-selected={option.value === value} tabIndex={-1} id={`${id}-option-${index}`} key={option.value} className="option-row" data-active={index === activeIndex} onClick={() => choose(option.value)}>
              <span><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</span>
            </button>)}
            {!matches.length && <p className="option-empty">No matching fonts. Clear the search to browse all fonts.</p>}
          </div>
          {searchable && <p className="option-count">{matches.length.toLocaleString()} fonts available</p>}
        </OptionPanel>}
      </AnimatePresence>, document.body)}
    </div>
  );
}
