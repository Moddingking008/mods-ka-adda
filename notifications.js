
import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    ref,
    query,
    orderByChild,
    limitToLast,
    onValue,
    push,
    set,
    remove
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";

const ADMIN_UID = "1Y1jqM92OuWYXPvPqkqTU8epe8G3";
const READ_KEY = "modsKaAddaReadNotifications";

let currentUser = null;
let notifications = [];
let unsubscribeNotifications = null;
let panelOpen = false;

function getReadIds() {
    try {
        return JSON.parse(localStorage.getItem(READ_KEY) || "[]");
    } catch {
        return [];
    }
}

function saveReadIds(ids) {
    try {
        localStorage.setItem(READ_KEY, JSON.stringify(ids));
    } catch {}
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function safeLink(value) {
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) ? url.href : "";
    } catch {
        return "";
    }
}

function timeAgo(timestamp) {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "";

    return date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function addStyles() {
    if (document.getElementById("mka-notification-style")) return;

    const style = document.createElement("style");
    style.id = "mka-notification-style";

    style.textContent = `
    #mkaBell {
        position:relative;
        border:1px solid rgba(255,255,255,.13);
        background:rgba(255,255,255,.07);
        color:white;
        width:42px;
        height:42px;
        border-radius:14px;
        font-size:21px;
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:center;
        flex-shrink:0;
    }

    #mkaBellCount {
        position:absolute;
        top:-6px;
        right:-6px;
        min-width:17px;
        height:17px;
        padding:0 4px;
        border-radius:20px;
        background:#ff3e70;
        color:white;
        font-size:10px;
        font-weight:800;
        display:none;
        align-items:center;
        justify-content:center;
        border:2px solid #07152b;
    }

    #mkaNotificationPanel {
        position:fixed;
        z-index:99999;
        top:75px;
        right:15px;
        width:min(370px, calc(100vw - 30px));
        max-height:75vh;
        overflow:auto;
        display:none;
        color:#fff;
        background:#0b1830;
        border:1px solid rgba(255,255,255,.13);
        border-radius:19px;
        box-shadow:0 15px 50px rgba(0,0,0,.55);
        padding:16px;
    }

    #mkaNotificationPanel.mka-show {
        display:block;
        animation:mkaPop .18s ease-out;
    }

    @keyframes mkaPop {
        from {opacity:0;transform:translateY(-8px)}
        to {opacity:1;transform:translateY(0)}
    }

    .mka-head {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        margin-bottom:14px;
    }

    .mka-head strong {
        font-size:17px;
    }

    .mka-close {
        border:0;
        background:rgba(255,255,255,.09);
        color:white;
        border-radius:9px;
        padding:6px 11px;
        cursor:pointer;
    }

    .mka-item {
        padding:13px;
        margin-bottom:10px;
        border-radius:13px;
        background:rgba(255,255,255,.055);
        border:1px solid rgba(255,255,255,.07);
        overflow-wrap:anywhere;
    }

    .mka-item h4 {
        margin:0 0 7px;
        font-size:14px;
        color:#fff;
    }

    .mka-item p {
        margin:0 0 9px;
        color:#c5d0e2;
        font-size:13px;
        line-height:1.5;
        white-space:pre-wrap;
    }

    .mka-time {
        font-size:10px;
        color:#8192ad;
    }

    .mka-link {
        display:inline-block;
        margin-top:9px;
        color:#8cb8ff;
        font-size:12px;
        text-decoration:none;
        font-weight:700;
    }

    .mka-admin-actions {
        display:flex;
        gap:8px;
        margin-top:10px;
    }

    .mka-admin-actions button,
    #mkaAddButton {
        border:0;
        border-radius:9px;
        padding:8px 12px;
        color:white;
        background:#263c65;
        cursor:pointer;
        font-size:12px;
    }

    #mkaAddButton {
        width:100%;
        margin-bottom:13px;
        background:linear-gradient(110deg,#6755e8,#267be9);
        font-weight:700;
        padding:11px;
    }

    .mka-empty {
        text-align:center;
        color:#91a1bb;
        font-size:13px;
        padding:25px 5px;
    }

    #mkaEditor {
        display:none;
        position:fixed;
        inset:0;
        z-index:100000;
        background:rgba(0,0,0,.75);
        align-items:center;
        justify-content:center;
        padding:15px;
    }

    #mkaEditor.mka-show {
        display:flex;
    }

    .mka-editor-box {
        width:min(420px,100%);
        background:#0c1b35;
        color:white;
        border:1px solid rgba(255,255,255,.15);
        border-radius:18px;
        padding:19px;
    }

    .mka-editor-box h3 {
        margin:0 0 15px;
    }

    .mka-editor-box input,
    .mka-editor-box textarea {
        box-sizing:border-box;
        width:100%;
        margin-bottom:11px;
        padding:12px;
        border:1px solid rgba(255,255,255,.13);
        border-radius:10px;
        background:#142642;
        color:white;
        outline:none;
        font:inherit;
        font-size:13px;
    }

    .mka-editor-box textarea {
        min-height:110px;
        resize:vertical;
    }

    .mka-editor-buttons {
        display:flex;
        gap:9px;
    }

    .mka-editor-buttons button {
        flex:1;
        border:0;
        border-radius:10px;
        padding:11px;
        cursor:pointer;
        color:white;
        font-weight:700;
    }

    #mkaPublish {
        background:#6557e8;
    }

    #mkaCancel {
        background:#293b58;
    }

    @media(max-width:480px) {
        #mkaNotificationPanel {
            top:68px;
            right:10px;
            width:calc(100vw - 20px);
        }
    }
    `;

    document.head.appendChild(style);
}

function createInterface() {
    if (document.getElementById("mkaBell")) return;

    addStyles();

    const nav = document.querySelector(".navbar nav") ||
                document.querySelector(".navbar");

    if (!nav) {
        console.error("Navbar not found.");
        return;
    }

    const bell = document.createElement("button");
    bell.id = "mkaBell";
    bell.type = "button";
    bell.setAttribute("aria-label", "Notifications");
    bell.innerHTML = `♢<span id="mkaBellCount">0</span>`;

    nav.appendChild(bell);

    const panel = document.createElement("div");
    panel.id = "mkaNotificationPanel";

    panel.innerHTML = `
        <div class="mka-head">
            <strong>🔔 Notifications</strong>
            <button class="mka-close" id="mkaClosePanel">✕</button>
        </div>
        <div id="mkaAdminArea"></div>
        <div id="mkaNotificationList">
            <div class="mka-empty">Loading notifications...</div>
        </div>
    `;

    document.body.appendChild(panel);

    const editor = document.createElement("div");
    editor.id = "mkaEditor";

    editor.innerHTML = `
        <div class="mka-editor-box">
            <h3 id="mkaEditorTitle">New Notification</h3>
            <form id="mkaNotificationForm">
                <input id="mkaTitle" maxlength="100"
                    placeholder="Notification title" required>
                <textarea id="mkaMessage" maxlength="1000"
                    placeholder="Write your notification..." required></textarea>
                <input id="mkaLink" type="url"
                    placeholder="Link (optional)">
                <div class="mka-editor-buttons">
                    <button id="mkaPublish" type="submit">Publish</button>
                    <button id="mkaCancel" type="button">Cancel</button>
                </div>
            </form>
        </div>
    `;

    document.body.appendChild(editor);

    bell.addEventListener("click", () => {
        panelOpen = !panelOpen;
        panel.classList.toggle("mka-show", panelOpen);

        if (panelOpen) {
            markAllRead();
            renderNotifications();
        }
    });

    document.getElementById("mkaClosePanel").onclick = () => {
        panelOpen = false;
        panel.classList.remove("mka-show");
    };

    document.getElementById("mkaCancel").onclick = closeEditor;

    document.getElementById("mkaNotificationForm").addEventListener(
        "submit",
        publishNotification
    );

    document.addEventListener("click", event => {
        if (
            panelOpen &&
            !panel.contains(event.target) &&
            !bell.contains(event.target)
        ) {
            panelOpen = false;
            panel.classList.remove("mka-show");
        }
    });
}

let editingId = null;

function openEditor(item = null) {
    editingId = item?.id || null;

    document.getElementById("mkaEditorTitle").textContent =
        editingId ? "Edit Notification" : "New Notification";

    document.getElementById("mkaTitle").value = item?.title || "";
    document.getElementById("mkaMessage").value = item?.message || "";
    document.getElementById("mkaLink").value = item?.link || "";

    document.getElementById("mkaEditor").classList.add("mka-show");
}

function closeEditor() {
    document.getElementById("mkaEditor").classList.remove("mka-show");
    document.getElementById("mkaNotificationForm").reset();
    editingId = null;
}

async function publishNotification(event) {
    event.preventDefault();

    if (currentUser?.uid !== ADMIN_UID) {
        alert("Only admin can publish notifications.");
        return;
    }

    const title = document.getElementById("mkaTitle").value.trim();
    const message = document.getElementById("mkaMessage").value.trim();
    const rawLink = document.getElementById("mkaLink").value.trim();
    const link = rawLink ? safeLink(rawLink) : "";

    if (!title || !message) {
        alert("Title aur message dono bharna zaroori hai.");
        return;
    }

    if (rawLink && !link) {
        alert("Please enter a valid HTTP/HTTPS link.");
        return;
    }

    const button = document.getElementById("mkaPublish");
    button.disabled = true;
    button.textContent = "Publishing...";

    try {
        const data = {
            title,
            message,
            timestamp: Date.now()
        };

        if (link) data.link = link;

        if (editingId) {
            await set(ref(db, "notifications/" + editingId), data);
        } else {
            const newRef = push(ref(db, "notifications"));
            await set(newRef, data);
        }

        closeEditor();
        alert(editingId ? "Notification updated!" : "Notification published!");
    } catch (error) {
        console.error(error);
        alert("Publish nahi hua: " + error.message);
    } finally {
        button.disabled = false;
        button.textContent = "Publish";
    }
}

async function deleteNotification(id) {
    if (currentUser?.uid !== ADMIN_UID) return;

    if (!confirm("Is notification ko delete karna hai?")) return;

    try {
        await remove(ref(db, "notifications/" + id));
    } catch (error) {
        alert("Delete failed: " + error.message);
    }
}

function markAllRead() {
    saveReadIds(notifications.map(item => item.id));
    updateBell();
}

function updateBell() {
    const count = document.getElementById("mkaBellCount");
    if (!count) return;

    const readIds = getReadIds();
    const unread = notifications.filter(item => !readIds.includes(item.id)).length;

    count.textContent = unread > 99 ? "99+" : unread;
    count.style.display = unread ? "flex" : "none";
}

function renderNotifications() {
    const list = document.getElementById("mkaNotificationList");
    const adminArea = document.getElementById("mkaAdminArea");

    if (!list || !adminArea) return;

    adminArea.innerHTML = "";

    if (currentUser?.uid === ADMIN_UID) {
        const addButton = document.createElement("button");
        addButton.id = "mkaAddButton";
        addButton.textContent = "+ Add Notification";
        addButton.onclick = () => openEditor();
        adminArea.appendChild(addButton);
    }

    list.innerHTML = "";

    if (!notifications.length) {
        list.innerHTML = `<div class="mka-empty">No notifications yet ✨</div>`;
        return;
    }

    notifications.forEach(item => {
        const card = document.createElement("div");
        card.className = "mka-item";

        const heading = document.createElement("h4");
        heading.textContent = item.title || "Notification";

        const message = document.createElement("p");
        message.textContent = item.message || "";

        const time = document.createElement("div");
        time.className = "mka-time";
        time.textContent = timeAgo(item.timestamp);

        card.append(heading, message);

        const link = safeLink(item.link);
        if (link) {
            const anchor = document.createElement("a");
            anchor.className = "mka-link";
            anchor.href = link;
            anchor.target = "_blank";
            anchor.rel = "noopener noreferrer";
            anchor.textContent = "Open Link ↗";
            card.appendChild(anchor);
        }

        card.appendChild(time);

        if (currentUser?.uid === ADMIN_UID) {
            const actions = document.createElement("div");
            actions.className = "mka-admin-actions";

            const edit = document.createElement("button");
            edit.textContent = "✏️ Edit";
            edit.onclick = () => openEditor(item);

            const del = document.createElement("button");
            del.textContent = "🗑 Delete";
            del.onclick = () => deleteNotification(item.id);

            actions.append(edit, del);
            card.appendChild(actions);
        }

        list.appendChild(card);
    });
}

function startNotificationListener() {
    if (unsubscribeNotifications) {
        unsubscribeNotifications();
        unsubscribeNotifications = null;
    }

    const notificationQuery = query(
        ref(db, "notifications"),
        orderByChild("timestamp"),
        limitToLast(50)
    );

    unsubscribeNotifications = onValue(
        notificationQuery,
        snapshot => {
            notifications = [];

            snapshot.forEach(child => {
                notifications.push({
                    id: child.key,
                    ...child.val()
                });
            });

            notifications.sort(
                (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
            );

            updateBell();
            renderNotifications();
        },
        error => {
            console.error("Notification read error:", error);
            document.getElementById("mkaNotificationList").innerHTML =
                `<div class="mka-empty">Notifications load nahi ho paaye.</div>`;
        }
    );
}

createInterface();

onAuthStateChanged(auth, user => {
    currentUser = user;

    if (user) {
        startNotificationListener();
    } else if (unsubscribeNotifications) {
        unsubscribeNotifications();
        unsubscribeNotifications = null;
    }

    renderNotifications();
});
