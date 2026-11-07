import { pinKey, buildNetlist } from '@pin-thirteen/circuit-core';
import { registry } from '@pin-thirteen/registry';
import { useState } from 'react';
import { nameOf } from './Art';
import { useApp } from './store';

/** The keyboard route for wiring, and the same information a mouse user sees. */
function WireForm({ from }: { from: string }) {
  const doc = useApp((s) => s.history.present);
  const connect = useApp((s) => s.connect);
  const [fromPin, setFromPin] = useState('');
  const [to, setTo] = useState('');
  const [toPin, setToPin] = useState('');
  const others = doc.components.filter((c) => c.id !== from);
  const target = to || others[0]?.id || '';
  if (!others.length) return null;
  return (
    <form
      className="wire-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (
          connect({ instance: from, pin: fromPin.trim() }, { instance: target, pin: toPin.trim() })
        ) {
          setFromPin('');
          setToPin('');
        }
      }}
    >
      <label>
        From pin
        <input value={fromPin} onChange={(e) => setFromPin(e.target.value)} />
      </label>
      <label>
        To part
        <select value={target} onChange={(e) => setTo(e.target.value)}>
          {others.map((c, i) => (
            <option key={c.id} value={c.id}>
              {nameOf(c.type)} {i + 1}
            </option>
          ))}
        </select>
      </label>
      <label>
        To pin
        <input value={toPin} onChange={(e) => setToPin(e.target.value)} />
      </label>
      <button className="tool" type="submit">
        Add wire
      </button>
    </form>
  );
}

export function Inspector() {
  const s = useApp();
  const doc = s.history.present;
  const wire = doc.wires.find((w) => w.id === s.selectedWire);
  const label = (instance: string, pin: string) => {
    const type = doc.components.find((c) => c.id === instance)?.type ?? '';
    return `${nameOf(type)} ${registry.get(type)?.pins.find((p) => p.id === pin)?.label ?? pin}`;
  };
  if (wire) {
    return (
      <aside className="inspect" aria-label="Inspector">
        <b>Jumper wire</b>
        <p>
          {label(wire.from.instance, wire.from.pin)} to {label(wire.to.instance, wire.to.pin)}
        </p>
        <button className="tool" onClick={() => s.removeSelectedWire()}>
          Remove wire
        </button>
      </aside>
    );
  }
  const component = doc.components.find((c) => c.id === s.selected);
  const definition = component && registry.get(component.type);
  if (!component || !definition) return null;
  const netlist = buildNetlist(doc, (t) => registry.get(t)?.connectivity);
  const connected = definition.isBoard
    ? []
    : definition.pins.flatMap((pin) => {
        const net = netlist.netOf(pinKey(component.id, pin.id)) ?? [];
        const others = net
          .map((k) => k.split(':') as [string, string])
          .filter(
            ([i]) =>
              i !== component.id &&
              doc.components.find((c) => c.id === i)?.type !== 'breadboard-830',
          );
        return others.length
          ? [
              `${pin.label}: ${others
                .map(([i, p]) => label(i, p))
                .slice(0, 4)
                .join(', ')}`,
            ]
          : [];
      });
  return (
    <aside className="inspect" aria-label="Inspector">
      <b>{definition.name}</b>
      <p>{definition.description}</p>
      {component.placement && (
        <p className="mono">HOLES {Object.values(component.placement.pins).join(' · ')}</p>
      )}
      {definition.params
        .filter((p) => typeof p.default === 'number')
        .map((p) => (
          <label key={p.key}>
            {p.label} ({p.unit})
            <input
              type="number"
              min="0"
              defaultValue={Number(component.params[p.key] ?? p.default)}
              key={String(component.params[p.key])}
              onBlur={(e) => s.setParam(component.id, p.key, Number(e.target.value))}
            />
          </label>
        ))}
      {connected.map((line) => (
        <p className="mono" key={line}>
          {line}
        </p>
      ))}
      <WireForm from={component.id} />
      <div className="row">
        {!definition.isBoard && (
          <button className="tool" onClick={() => s.rotate(component.id)}>
            Rotate
          </button>
        )}
        <button className="tool" onClick={() => s.remove(component.id)}>
          Remove
        </button>
      </div>
    </aside>
  );
}
