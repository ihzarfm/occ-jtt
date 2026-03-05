import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createUser, listUsers, updateUser } from "../api/users";
import { normalizeUserField, validateUserForm } from "../utils/validators";

const emptyUserForm = { name: "", nik: "", password: "", role: "support" };
const emptyUserFormErrors = { name: "", nik: "" };

function roleLabel(role) {
  if (role === "superadmin") return "Superadmin";
  if (role === "administrator") return "Administrator";
  return "Support";
}

function userMatchesSearch(user, searchValue) {
  const query = String(searchValue || "").trim().toLowerCase();
  if (!query) return true;
  const haystack = [user.username, user.name, user.nik].join(" ").toLowerCase();
  return haystack.includes(query);
}

export default function UsersView({ mode, active }) {
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [editUserForm, setEditUserForm] = useState(emptyUserForm);
  const [userFormErrors, setUserFormErrors] = useState(emptyUserFormErrors);
  const [editUserFormErrors, setEditUserFormErrors] = useState(emptyUserFormErrors);
  const [editingUsername, setEditingUsername] = useState("");

  const selectUserForEdit = useCallback((user) => {
    if (!user) {
      setEditingUsername("");
      setEditUserForm(emptyUserForm);
      setEditUserFormErrors(emptyUserFormErrors);
      return;
    }
    setEditingUsername(user.username || "");
    setEditUserForm({ name: user.name || "", nik: user.nik || "", password: "", role: user.role || "support" });
    setEditUserFormErrors(emptyUserFormErrors);
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setError("");
    try {
      const { response, data } = await listUsers();
      if (!response.ok) throw new Error(data.error || "Failed to fetch users");
      const userItems = Array.isArray(data) ? data : [];
      setUsers(userItems);
      if (userItems.length > 0 && !editingUsername) selectUserForEdit(userItems[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setUsersLoading(false);
    }
  }, [editingUsername, selectUserForEdit]);

  useEffect(() => {
    if (!active) return;
    loadUsers();
  }, [active, loadUsers, mode]);

  useEffect(() => {
    if (!active) return undefined;
    const handler = () => loadUsers();
    window.addEventListener("occ-refresh-current-view", handler);
    return () => window.removeEventListener("occ-refresh-current-view", handler);
  }, [active, loadUsers]);

  const updateUserField = (event) => {
    const { name, value } = event.target;
    const nextValue = normalizeUserField(name, value);
    setUserForm((current) => ({ ...current, [name]: nextValue }));
    if (name === "name" || name === "nik") setUserFormErrors((current) => ({ ...current, [name]: "" }));
  };

  const updateEditUserField = (event) => {
    const { name, value } = event.target;
    const nextValue = normalizeUserField(name, value);
    setEditUserForm((current) => ({ ...current, [name]: nextValue }));
    if (name === "name" || name === "nik") setEditUserFormErrors((current) => ({ ...current, [name]: "" }));
  };

  const createUserAccount = async (event) => {
    event.preventDefault();
    const validationErrors = validateUserForm(userForm);
    setUserFormErrors(validationErrors);
    if (validationErrors.name || validationErrors.nik) return;

    setSaving(true);
    setError("");
    try {
      const { response, data } = await createUser(userForm);
      if (!response.ok) throw new Error(data.error || "Failed to create user");
      setUserForm(emptyUserForm);
      setUserFormErrors(emptyUserFormErrors);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateUserAccount = async (event) => {
    event.preventDefault();
    if (!editingUsername) {
      setError("Select a user first.");
      return;
    }
    const validationErrors = validateUserForm(editUserForm);
    setEditUserFormErrors(validationErrors);
    if (validationErrors.name || validationErrors.nik) return;

    setSaving(true);
    setError("");
    try {
      const { response, data } = await updateUser(editingUsername, editUserForm);
      if (!response.ok) throw new Error(data.error || "Failed to update user");
      await loadUsers();
      selectUserForEdit(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const visibleUsers = useMemo(() => users.filter((user) => userMatchesSearch(user, userSearch)), [users, userSearch]);

  if (mode === "create") {
    return (
      <section className="panel">
        <div className="panel-head">
          <h2>Create User</h2>
          <span>Create application access</span>
        </div>
        {error ? <div className="alert">{error}</div> : null}
        <form className="settings-form" onSubmit={createUserAccount}>
          <label>
            Name <span className="required-indicator">*</span>
            <input name="name" value={userForm.name} onChange={updateUserField} pattern="[A-Za-z]+" title="Letters only, no spaces" aria-invalid={userFormErrors.name ? "true" : "false"} required />
            {userFormErrors.name ? <small className="field-error">{userFormErrors.name}</small> : null}
          </label>
          <label>
            NIK (6 digits) <span className="required-indicator">*</span>
            <input name="nik" value={userForm.nik} onChange={updateUserField} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} title="Exactly 6 digits" aria-invalid={userFormErrors.nik ? "true" : "false"} required />
            {userFormErrors.nik ? <small className="field-error">{userFormErrors.nik}</small> : null}
          </label>
          <label>
            Password
            <input name="password" type="password" value={userForm.password} onChange={updateUserField} required />
          </label>
          <label>
            Role
            <select name="role" value={userForm.role} onChange={updateUserField}>
              <option value="support">Support</option>
              <option value="administrator">Administrator</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </label>
          <button type="submit" disabled={saving}>Create User</button>
        </form>
      </section>
    );
  }

  if (mode === "update") {
    return (
      <section className="panel">
        <div className="panel-head">
          <h2>Update User</h2>
          <span>Edit existing application users</span>
        </div>
        {error ? <div className="alert">{error}</div> : null}
        {usersLoading ? <div className="empty">Loading users...</div> : null}
        {!usersLoading && users.length === 0 ? <div className="empty">No users available to update.</div> : null}
        {!usersLoading && users.length > 0 ? (
          <>
            <label className="user-select">
              Select User
              <select value={editingUsername} onChange={(event) => {
                const selected = users.find((user) => user.username === event.target.value);
                selectUserForEdit(selected || null);
              }}>
                {users.map((user) => (
                  <option key={user.username} value={user.username}>{user.name} ({user.username})</option>
                ))}
              </select>
            </label>

            <form className="settings-form" onSubmit={updateUserAccount}>
              <label>
                Name <span className="required-indicator">*</span>
                <input name="name" value={editUserForm.name} onChange={updateEditUserField} pattern="[A-Za-z]+" title="Letters only, no spaces" aria-invalid={editUserFormErrors.name ? "true" : "false"} required />
                {editUserFormErrors.name ? <small className="field-error">{editUserFormErrors.name}</small> : null}
              </label>
              <label>
                NIK (6 digits) <span className="required-indicator">*</span>
                <input name="nik" value={editUserForm.nik} onChange={updateEditUserField} inputMode="numeric" pattern="[0-9]{6}" maxLength={6} title="Exactly 6 digits" aria-invalid={editUserFormErrors.nik ? "true" : "false"} required />
                {editUserFormErrors.nik ? <small className="field-error">{editUserFormErrors.nik}</small> : null}
              </label>
              <label>
                Password (leave blank to keep current)
                <input name="password" type="password" value={editUserForm.password} onChange={updateEditUserField} />
              </label>
              <label>
                Role
                <select name="role" value={editUserForm.role} onChange={updateEditUserField}>
                  <option value="support">Support</option>
                  <option value="administrator">Administrator</option>
                  <option value="superadmin">Superadmin</option>
                </select>
              </label>
              <button type="submit" disabled={saving}>Update User</button>
            </form>
          </>
        ) : null}
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>User List</h2>
        <span>Registered application users</span>
      </div>
      {error ? <div className="alert">{error}</div> : null}
      <section className="list-toolbar" aria-label="User Search">
        <label className="monitor-search">
          <span className="sr-only">Search users</span>
          <input type="search" value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search by name or NIK..." />
        </label>
      </section>

      {usersLoading ? <div className="empty">Loading users...</div> : null}
      {!usersLoading && users.length === 0 ? <div className="empty">No users registered yet.</div> : null}
      {!usersLoading && users.length > 0 && visibleUsers.length === 0 ? <div className="empty">No user matches the current search.</div> : null}
      {!usersLoading && visibleUsers.length > 0 ? (
        <div className="user-list-grid">
          {visibleUsers.map((user) => (
            <article className="user-card" key={user.username}>
              <div>
                <h3>{user.name}</h3>
                <p>NIK: {user.nik || user.username}</p>
              </div>
              <div className="user-card-meta">
                <span className={`role-pill role-${user.role}`}>{roleLabel(user.role)}</span>
                {user.builtIn ? <small>Built-in</small> : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
