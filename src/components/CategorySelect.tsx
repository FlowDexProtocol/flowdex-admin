'use client';

import { useEffect, useState } from 'react';
import { useAdminAuth } from '@/context/admin-auth-context';
import { useToast } from '@/context/toast-context';
import { createBlogCategory, getBlogCategories } from '@/lib/api';
import { Button, Input, Label, Select } from './ui';

const ADD_NEW_VALUE = '__add_new_category__';

export default function CategorySelect({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (category: string) => void;
  required?: boolean;
}) {
  const { adminFetch } = useAdminAuth();
  const { showToast } = useToast();
  const [categories, setCategories] = useState<string[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    adminFetch((t) => getBlogCategories(t))
      .then((cats) => {
        if (cancelled) return;
        setCategories(cats);
        if (cats.length > 0 && !cats.includes(value)) onChange(cats[0]);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      });
    return () => {
      cancelled = true;
    };
    // Only refetch if adminFetch identity changes (re-login) — not on every
    // `value`/`onChange` change, which would refire this on every keystroke
    // elsewhere in the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminFetch]);

  async function handleAdd() {
    const name = newName.trim().toLowerCase();
    if (!name) return;
    setSaving(true);
    try {
      const res = await adminFetch((t) => createBlogCategory(t, name));
      setCategories(res.categories);
      onChange(name);
      setAdding(false);
      setNewName('');
      showToast('success', `Category "${name}" added`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to add category');
    } finally {
      setSaving(false);
    }
  }

  if (adding) {
    // A <form> here (BlogEditorForm's own <form> already wraps this whole
    // component) would be an invalid nested <form> — the browser silently
    // drops the inner one and hydration breaks, so this is a plain <div>
    // with the Enter/Escape keyboard handling a <form> would normally give
    // for free, wired up by hand instead.
    return (
      <div>
        <Label required={required}>Category</Label>
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_-]/g, ''))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                setAdding(false);
                setNewName('');
              }
            }}
            placeholder="new_category"
            className="font-mono"
            maxLength={50}
            autoFocus
          />
          <Button type="button" onClick={handleAdd} disabled={saving || !newName.trim()} className="shrink-0">
            {saving ? 'Adding…' : 'Add'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="shrink-0"
            onClick={() => {
              setAdding(false);
              setNewName('');
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Label required={required}>Category</Label>
      <Select
        value={value}
        disabled={!categories}
        onChange={(e) => {
          if (e.target.value === ADD_NEW_VALUE) setAdding(true);
          else onChange(e.target.value);
        }}
      >
        {!categories ? (
          <option>Loading…</option>
        ) : (
          <>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value={ADD_NEW_VALUE}>+ Add New Category</option>
          </>
        )}
      </Select>
    </div>
  );
}
