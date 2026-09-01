"use client";

import { useState } from "react";
import { INVENTORY_UNITS, type InventoryItem } from "@/lib/admin";
import { Button, Checkbox, Field, Input, Modal, Select, Textarea } from "@/components/admin/ui";

export const INVENTORY_GROUPS = ["Raw Material", "Packaging", "Ingredient", "Equipment", "Others"];

export type ItemForm = {
  _id?: string;
  name: string;
  code: string;
  unit: string;
  group: string;
  openingStock: string;
  openingRate: string;
  lowStockAlert: string;
  supplier: string;
  note: string;
  isActive: boolean;
};

export const blankItem: ItemForm = {
  name: "", code: "", unit: "kg", group: "Raw Material",
  openingStock: "0", openingRate: "0", lowStockAlert: "0", supplier: "", note: "", isActive: true,
};

/** Turn an API item into the editable form shape. */
export function itemToForm(i: InventoryItem): ItemForm {
  return {
    _id: i._id,
    name: i.name,
    code: i.code || "",
    unit: i.unit,
    group: i.group || "Raw Material",
    openingStock: String(i.openingStock ?? 0),
    openingRate: String(i.openingRate ?? 0),
    lowStockAlert: String(i.lowStockAlert ?? 0),
    supplier: i.supplier || "",
    note: i.note || "",
    isActive: i.isActive !== false,
  };
}

/** Build the API payload from a form. */
export function formToPayload(f: ItemForm): Record<string, unknown> {
  return {
    name: f.name.trim(),
    code: f.code,
    unit: f.unit,
    group: f.group,
    openingStock: Number(f.openingStock) || 0,
    openingRate: Number(f.openingRate) || 0,
    lowStockAlert: Number(f.lowStockAlert) || 0,
    supplier: f.supplier,
    note: f.note,
    isActive: f.isActive,
  };
}

export default function ItemEditor({
  initial, onSave, onClose, saving,
}: {
  initial: ItemForm;
  onSave: (f: ItemForm) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [f, setF] = useState<ItemForm>(initial);
  const [err, setErr] = useState("");
  const set = <K extends keyof ItemForm>(k: K, v: ItemForm[K]) => setF((s) => ({ ...s, [k]: v }));

  return (
    <Modal
      title={f._id ? "Edit product" : "New product"}
      desc="A product is anything you buy — flour, oil, chicken, packaging…"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (!f.name.trim()) return setErr("Please type the product name.");
              setErr("");
              onSave(f);
            }}
            disabled={saving}
          >
            {saving ? "Saving…" : f._id ? "Save changes" : "Create product"}
          </Button>
        </>
      }
    >
      {!f._id ? (
        /* ── Create: just the product name ── */
        <div className="grid gap-4">
          <Field label="Product name" required>
            <Input autoFocus value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Flour (Moyda), Potato, Oil" />
          </Field>
          {err && <div className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm text-brand-dark">{err}</div>}
        </div>
      ) : (
        /* ── Edit: full details ── */
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product name" required hint="What you are buying.">
              <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Flour (Moyda), Potato, Oil" />
            </Field>
            <Field label="Measured in" required hint="How you count it — kg, litre, pcs…">
              <Select value={f.unit} onChange={(e) => set("unit", e.target.value)}>
                {INVENTORY_UNITS.map((u) => (<option key={u} value={u}>{u}</option>))}
              </Select>
            </Field>
            <Field label="Category" hint="Just for grouping in reports.">
              <Select value={f.group} onChange={(e) => set("group", e.target.value)}>
                {INVENTORY_GROUPS.map((g) => (<option key={g} value={g}>{g}</option>))}
              </Select>
            </Field>
            <Field label="Item code" hint="Optional — your own reference code.">
              <Input value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="RM-001" />
            </Field>
            <Field label="Opening stock" hint="Stock you started with, before any purchases. Leave 0 if none.">
              <Input type="number" step="any" value={f.openingStock} onChange={(e) => set("openingStock", e.target.value)} placeholder="0" />
            </Field>
            <Field label="Its cost (৳ per unit)" hint="What that opening stock cost you, per unit. Optional.">
              <Input type="number" step="any" value={f.openingRate} onChange={(e) => set("openingRate", e.target.value)} placeholder="e.g. 40" />
            </Field>
            <Field label="Warn me when stock drops to" hint="Get a low-stock alert at this level. 0 = off.">
              <Input type="number" step="any" value={f.lowStockAlert} onChange={(e) => set("lowStockAlert", e.target.value)} />
            </Field>
            <Field label="Usual supplier" hint="Shop you normally buy from. Optional.">
              <Input value={f.supplier} onChange={(e) => set("supplier", e.target.value)} placeholder="Karim Traders" />
            </Field>
          </div>
          <Field label="Note" hint="Anything else you want to remember.">
            <Textarea rows={2} value={f.note} onChange={(e) => set("note", e.target.value)} />
          </Field>
          <Checkbox checked={f.isActive} onChange={(v) => set("isActive", v)} label="Active" hint="uncheck to retire the product" />
          {err && <div className="rounded-lg bg-brand-tint px-4 py-2.5 text-sm text-brand-dark">{err}</div>}
        </div>
      )}
    </Modal>
  );
}
