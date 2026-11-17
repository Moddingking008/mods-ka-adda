
import {
    auth,
    db,
    signInAnonymously
} from "./firebase.js";

import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    ref,
    query,
    orderByChild,
    limitToLast,
    onChildAdded,
    onChildRemoved,
    push,
    set,
    remove
} from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";


const $ = id => document.getElementById(id);


/* =========================
   ADMIN
========================= */

const ADMIN_UID = "1Y1jqM92OuWYXPvPqkqTU8epe8G3";

let currentUser = null;


/* =========================
   APP DATA
========================= */

let apps = [];
let selectedCategory = "All";


/* =========================
   SAFE HTML
========================= */

function escapeHTML(value) {

    return String(value ?? "")
        .replace(/[&<>"']/g, char => {

            const map = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return map[char];

        });

}


/* =========================
   SAFE URL
========================= */

function safeURL(value, fallback = "") {

    try {

        const url = new URL(
            String(value || ""),
            location.href
        );

        if (
            url.protocol === "https:" ||
            url.protocol === "http:"
        ) {
            return url.href;
        }

        return fallback;

    } catch {

        return fallback;

    }

}


/* =========================
   LOAD JSON
========================= */

async function loadJSON(file) {

    try {

        const response = await fetch(file, {
            cache: "default"
        });

        if (!response.ok) {
            throw new Error("Failed to load " + file);
        }

        return await response.json();

    } catch (error) {

        console.error("JSON load failed:", file, error);

        return [];

    }

}


/* =========================
   APPS
========================= */

async function loadApps() {

    apps = await loadJSON("data/apps.json");

    if (!Array.isArray(apps)) {
        apps = [];
    }

    createCategories();
    displayApps();

}


/* =========================
   CATEGORIES
========================= */

function createCategories() {

    const categoryBar = $("categoryBar");

    if (!categoryBar) return;

    const categories = [
        "All",
        ...new Set(
            apps.map(app => app.category || "Other")
        )
    ];

    categoryBar.innerHTML =
        categories.map(category => `

            <button
                class="category ${
                    category === selectedCategory ? "active" : ""
                }"
                data-category="${escapeHTML(category)}">

                ${escapeHTML(category)}

            </button>

        `).join("");

    categoryBar
        .querySelectorAll(".category")
        .forEach(button => {

            button.onclick = () => {

                selectedCategory = button.dataset.category;

                createCategories();
                displayApps();

            };

        });

}


/* =========================
   DISPLAY APPS
========================= */

function displayApps() {

    const grid = $("appGrid");

    if (!grid) return;

    const searchInput = $("searchInput");

    const search = searchInput
        ? searchInput.value.trim().toLowerCase()
        : "";

    const filtered = apps.filter(app => {

        const name = String(
            app.name || ""
        ).toLowerCase();

        const category = String(
            app.category || "Other"
        ).toLowerCase();

        const categoryMatch =
            selectedCategory === "All" ||
            (app.category || "Other") === selectedCategory;

        const searchMatch =
            !search ||
            name.includes(search) ||
            category.includes(search);

        return categoryMatch && searchMatch;

    });


    const count = $("appCount");

    if (count) {

        count.textContent =
            `${apps.length} App${apps.length === 1 ? "" : "s"}`;

    }


    grid.innerHTML = filtered.map((app, position) => {

        const index = apps.indexOf(app);

        const image = safeURL(
            app.image || app.logo || app.icon,
            "images/apps/placeholder.svg"
        );

        const download = safeURL(
            app.download || app.link,
            ""
        );

        const appName = escapeHTML(
            app.name || "Untitled App"
        );

        const imagePriority =
            position < 6 ? "eager" : "lazy";

        const fetchPriority =
            position < 3 ? "high" : "auto";

        return `

            <article class="app-card">

                <img
                    class="app-image"
                    src="${escapeHTML(image)}"
                    alt="${appName}"
                    loading="${imagePriority}"
                    fetchpriority="${fetchPriority}"
                    decoding="async"
                    onerror="this.onerror=null;this.src='images/apps/placeholder.svg';"
                >

                <h3>${appName}</h3>

                <div class="app-info">

                    v${escapeHTML(app.version || "Latest")}

                    •

                    ${escapeHTML(app.size || "—")}

                    <br>

                    ${escapeHTML(app.category || "Other")}

                    • ⭐

                    ${escapeHTML(app.rating ?? "—")}

                </div>

                ${
                    app.mod
                    ?
                    `
                    <span class="mod-badge">
                        ${escapeHTML(app.mod)}
                    </span>
                    `
                    :
                    ""
                }

                <div class="card-buttons">

                    <a
                        class="btn secondary"
                        href="app.html?id=${index}">

                        Details

                    </a>

                    ${
                        download
                        ?
                        `
                        <a
                            class="btn primary"
                            href="${escapeHTML(download)}"
                            target="_blank"
                            rel="noopener noreferrer">

                            ⬇ Download

                        </a>
                        `
                        :
                        ""
                    }

                </div>

            </article>

        `;

    }).join("");


    const emptyApps = $("emptyApps");

    if (emptyApps) {

        emptyApps.style.display =
            filtered.length ? "none" : "block";

    }

}


/* =========================
   SEARCH
========================= */

const searchInput = $("searchInput");

if (searchInput) {

    searchInput.addEventListener(
        "input",
        displayApps
    );

}


/* =========================
   ANNOUNCEMENTS
========================= */

function makeAnnouncementHTML(data) {

    if (!Array.isArray(data) || data.length === 0) {

        return `
            <div class="moving-announcement-item">
                No announcements yet.
            </div>
        `;

    }

    return data.map(item => {

        const title = escapeHTML(
            item.title || "Update"
        );

        let safeText = escapeHTML(
            String(item.text || "")
        );

        safeText = safeText.replace(
            /(https?:\/\/[^\s<]+)/g,
            ' <a href="$1" target="_blank" rel="noopener noreferrer">$1</a> '
        );

        return `

            <div class="moving-announcement-item">

                ${title}

                ${
                    safeText
                    ?
                    `
                    <span class="dot"></span>
                    ${safeText}
                    `
                    :
                    ""
                }

                <span class="dot"></span>

            </div>

        `;

    }).join("");

}


async function loadAnnouncements() {

    const track = $("announcementTrack");

    if (!track) return;

    const data = await loadJSON(
        "data/announcements.json"
    );

    const content = makeAnnouncementHTML(data);

    track.innerHTML = content + content;

}


/* =========================
   CHAT USER NAME
========================= */

function userName(uid) {

    if (uid === ADMIN_UID) {
        return "ADMIN";
    }

    return "User-" +
        String(uid || "0000").slice(-4).toUpperCase();

}


/* =========================
   CHAT TIME
========================= */

function timeFormat(timestamp) {

    if (!timestamp) return "";

    return new Date(timestamp)
        .toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        });

}


/* =========================
   CHAT STATE
========================= */

let replyTarget = null;

let messageElements = new Map();

let contextMenu = null;

let replyPreview = null;


/* =========================
   CHAT STYLE
========================= */

function addChatStyles() {

    if ($("premiumChatStyles")) return;

    const style = document.createElement("style");

    style.id = "premiumChatStyles";

    style.textContent = `

        .message {
            position: relative;
            touch-action: pan-y;
            user-select: none;
            -webkit-user-select: none;
            transition: transform .18s ease, background .18s ease;
            cursor: pointer;
        }

        .message.swipe-reply {
            transform: translateX(55px);
        }

        .message.message-own {
            border-color: rgba(120,90,255,.35);
        }

        .message-reply-quote {
            display: block;
            padding: 9px 11px;
            margin-bottom: 9px;
            border-left: 3px solid #9b7cff;
            border-radius: 8px;
            background: rgba(135,100,255,.10);
            overflow: hidden;
        }

        .message-reply-name {
            display: block;
            color: #b69aff;
            font-size: 12px;
            font-weight: 800;
            margin-bottom: 3px;
        }

        .message-reply-text {
            display: block;
            font-size: 13px;
            opacity: .8;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .message-user {
            font-weight: 800;
        }

        .message-user.admin-name {
            color: #ffc85a;
        }

        .chat-reply-preview {
            display: none;
            width: 100%;
            box-sizing: border-box;
            padding: 10px 12px;
            margin-bottom: 9px;
            border-left: 3px solid #a78bfa;
            border-radius: 10px;
            background: rgba(130,100,255,.13);
            color: inherit;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }

        .chat-reply-preview.active {
            display: flex;
        }

        .chat-reply-preview-content {
            min-width: 0;
            overflow: hidden;
        }

        .chat-reply-preview-title {
            color: #b69aff;
            font-size: 12px;
            font-weight: 800;
            margin-bottom: 3px;
        }

        .chat-reply-preview-text {
            font-size: 13px;
            opacity: .8;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
        }

        .chat-reply-cancel {
            flex-shrink: 0;
            border: 0;
            background: transparent;
            color: inherit;
            font-size: 22px;
            cursor: pointer;
            padding: 3px 8px;
        }

        .chat-context-menu {
            position: fixed;
            z-index: 100000;
            min-width: 155px;
            padding: 6px;
            border: 1px solid rgba(160,140,255,.25);
            border-radius: 13px;
            background: #111426;
            box-shadow: 0 12px 35px rgba(0,0,0,.55);
            display: none;
        }

        .chat-context-menu.active {
            display: block;
            animation: chatMenuIn .15s ease;
        }

        @keyframes chatMenuIn {
            from {
                opacity: 0;
                transform: scale(.94);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        .chat-context-menu button {
            display: block;
            width: 100%;
            padding: 11px 12px;
            border: 0;
            border-radius: 8px;
            background: transparent;
            color: #f4f1ff;
            text-align: left;
            font-size: 14px;
            cursor: pointer;
        }

        .chat-context-menu button:active {
            background: rgba(150,120,255,.2);
        }

        .chat-context-menu button.delete-option {
            color: #ff7777;
        }

        #chatForm {
            flex-wrap: wrap;
        }

        .message-deleted {
            opacity: .4;
        }

        @media (prefers-reduced-motion: reduce) {
            .message,
            .chat-context-menu {
                animation: none !important;
                transition: none !important;
            }
        }

    `;

    document.head.appendChild(style);

}


/* =========================
   REPLY PREVIEW
========================= */

function setupReplyPreview() {

    const form = $("chatForm");

    if (!form || replyPreview) return;

    replyPreview = document.createElement("div");

    replyPreview.className = "chat-reply-preview";

    replyPreview.innerHTML = `

        <div class="chat-reply-preview-content">

            <div class="chat-reply-preview-title">
                Replying to
            </div>

            <div class="chat-reply-preview-text"></div>

        </div>

        <button
            type="button"
            class="chat-reply-cancel"
            aria-label="Cancel reply">
            ×
        </button>

    `;

    form.insertBefore(
        replyPreview,
        form.firstChild
    );

    replyPreview
        .querySelector(".chat-reply-cancel")
        .onclick = clearReply;

}


function setReply(data, key) {

    if (!data || !key) return;

    replyTarget = {
        key,
        uid: data.uid || "",
        text: String(data.text || "")
    };

    if (!replyPreview) {
        setupReplyPreview();
    }

    if (!replyPreview) return;

    replyPreview.querySelector(
        ".chat-reply-preview-text"
    ).textContent = replyTarget.text;

    replyPreview.classList.add("active");

    const input = $("chatInput");

    if (input) {
        input.focus();
    }

    closeContextMenu();

}


function clearReply() {

    replyTarget = null;

    if (replyPreview) {
        replyPreview.classList.remove("active");
    }

}


/* =========================
   CONTEXT MENU
========================= */

function setupContextMenu() {

    if (contextMenu) return;

    contextMenu = document.createElement("div");

    contextMenu.className = "chat-context-menu";

    contextMenu.innerHTML = `

        <button type="button" data-action="reply">
            ↩ Reply
        </button>

        <button type="button" data-action="copy">
            ▣ Copy
        </button>

        <button
            type="button"
            data-action="delete"
            class="delete-option">
            ✕ Delete
        </button>

    `;

    document.body.appendChild(contextMenu);

    contextMenu.addEventListener("click", async event => {

        const button = event.target.closest("button");

        if (!button || !contextMenuData) return;

        const action = button.dataset.action;

        const selected = contextMenuData;

        if (action === "reply") {

            setReply(selected.data, selected.key);

        }

        if (action === "copy") {

            await copyMessage(selected.data.text || "");

        }

        if (action === "delete") {

            await deleteMessage(
                selected.key,
                selected.data,
                selected.element
            );

        }

        closeContextMenu();

    });

    document.addEventListener("click", event => {

        if (
            contextMenu &&
            !contextMenu.contains(event.target)
        ) {
            closeContextMenu();
        }

    });

    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {
            closeContextMenu();
        }

    });

}


let contextMenuData = null;


function showContextMenu(event, data, key, element) {

    setupContextMenu();

    contextMenuData = {
        data,
        key,
        element
    };

    const canDelete =
        currentUser &&
        (
            currentUser.uid === ADMIN_UID ||
            currentUser.uid === data.uid
        );

    const deleteButton = contextMenu.querySelector(
        '[data-action="delete"]'
    );

    deleteButton.style.display =
        canDelete ? "block" : "none";

    const x = Math.min(
        Math.max(8, event.clientX || 20),
        window.innerWidth - 175
    );

    const y = Math.min(
        Math.max(8, event.clientY || 20),
        window.innerHeight - 160
    );

    contextMenu.style.left = x + "px";
    contextMenu.style.top = y + "px";

    contextMenu.classList.add("active");

}


function closeContextMenu() {

    if (!contextMenu) return;

    contextMenu.classList.remove("active");

    contextMenuData = null;

}


/* =========================
   COPY MESSAGE
========================= */

async function copyMessage(text) {

    try {

        if (navigator.clipboard && window.isSecureContext) {

            await navigator.clipboard.writeText(text);

        } else {

            const textarea = document.createElement("textarea");

            textarea.value = text;

            textarea.style.position = "fixed";
            textarea.style.opacity = "0";

            document.body.appendChild(textarea);

            textarea.select();

            document.execCommand("copy");

            textarea.remove();

        }

    } catch (error) {

        console.error("Copy failed:", error);

        alert("Could not copy message.");

    }

}


/* =========================
   DELETE MESSAGE
========================= */

async function deleteMessage(key, data, element) {

    if (!currentUser || !key || !data) return;

    const allowed =
        currentUser.uid === ADMIN_UID ||
        currentUser.uid === data.uid;

    if (!allowed) {

        alert("You cannot delete this message.");

        return;

    }

    if (!confirm("Delete this message?")) return;

    try {

        await remove(
            ref(db, "messages/" + key)
        );

        if (element) {
            element.remove();
        }

        messageElements.delete(key);

        if (replyTarget && replyTarget.key === key) {
            clearReply();
        }

    } catch (error) {

        console.error("Delete failed:", error);

        alert("Message delete failed.");

    }

}


/* =========================
   MESSAGE GESTURES
========================= */

function setupMessageGestures(message, data, key) {

    let startX = 0;
    let startY = 0;

    let currentX = 0;

    let longPressTimer = null;

    let longPressTriggered = false;

    let tracking = false;

    const LONG_PRESS_TIME = 550;
    const SWIPE_DISTANCE = 65;


    function cancelLongPress() {

        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }

    }


    message.addEventListener("touchstart", event => {

        if (event.touches.length !== 1) return;

        const touch = event.touches[0];

        startX = touch.clientX;
        startY = touch.clientY;
        currentX = startX;

        tracking = true;
        longPressTriggered = false;

        cancelLongPress();

        longPressTimer = setTimeout(() => {

            if (!tracking) return;

            longPressTriggered = true;

            if (navigator.vibrate) {
                navigator.vibrate(25);
            }

            showContextMenu(
                {
                    clientX: startX,
                    clientY: startY
                },
                data,
                key,
                message
            );

        }, LONG_PRESS_TIME);

    }, { passive: true });


    message.addEventListener("touchmove", event => {

        if (!tracking || !event.touches.length) return;

        const touch = event.touches[0];

        currentX = touch.clientX;

        const deltaX = currentX - startX;
        const deltaY = touch.clientY - startY;

        if (
            Math.abs(deltaX) > 10 ||
            Math.abs(deltaY) > 10
        ) {
            cancelLongPress();
        }

        if (
            deltaX > 0 &&
            Math.abs(deltaX) > Math.abs(deltaY)
        ) {

            message.classList.add("swipe-reply");

        } else {

            message.classList.remove("swipe-reply");

        }

    }, { passive: true });


    message.addEventListener("touchend", () => {

        cancelLongPress();

        if (!tracking) return;

        tracking = false;

        const deltaX = currentX - startX;

        message.classList.remove("swipe-reply");

        if (
            !longPressTriggered &&
            deltaX >= SWIPE_DISTANCE
        ) {

            setReply(data, key);

        }

    });


    message.addEventListener("touchcancel", () => {

        cancelLongPress();

        tracking = false;

        message.classList.remove("swipe-reply");

    });


    message.addEventListener("contextmenu", event => {

        event.preventDefault();

        showContextMenu(
            event,
            data,
            key,
            message
        );

    });

}


/* =========================
   ADD MESSAGE
========================= */

function addMessage(data, messageKey) {

    const box = $("chatMessages");

    if (!box || !data || !messageKey) return;

    if (messageElements.has(messageKey)) return;

    const loading = box.querySelector(".chat-loading");

    if (loading) loading.remove();


    const wasNearBottom =
        box.scrollHeight - box.scrollTop - box.clientHeight < 100;


    const message = document.createElement("div");

    message.className = "message";

    if (currentUser && data.uid === currentUser.uid) {
        message.classList.add("message-own");
    }


    /* USER NAME */

    const user = document.createElement("div");

    user.className = "message-user";

    user.textContent = userName(data.uid || "0000");

    if (data.uid === ADMIN_UID) {
        user.classList.add("admin-name");
    }


    /* REPLY QUOTE */

    if (data.replyTo && data.replyTo.text) {

        const quote = document.createElement("div");

        quote.className = "message-reply-quote";

        const replyName = document.createElement("span");

        replyName.className = "message-reply-name";

        replyName.textContent =
            userName(data.replyTo.uid || "0000");

        const replyText = document.createElement("span");

        replyText.className = "message-reply-text";

        replyText.textContent = data.replyTo.text;

        quote.append(replyName, replyText);

        message.appendChild(quote);

    }


    /* MESSAGE TEXT */

    const text = document.createElement("div");

    text.className = "message-text";

    text.textContent = data.text || "";


    /* TIME */

    const time = document.createElement("div");

    time.className = "message-time";

    time.textContent = timeFormat(data.timestamp);


    message.append(user, text, time);


    /* GESTURES */

    setupMessageGestures(
        message,
        data,
        messageKey
    );


    messageElements.set(
        messageKey,
        message
    );

    box.appendChild(message);


    if (wasNearBottom) {
        box.scrollTop = box.scrollHeight;
    }

}


/* =========================
   REMOVE DELETED MESSAGES
========================= */

function handleRemovedMessage(snapshot) {

    const key = snapshot.key;

    const element = messageElements.get(key);

    if (element) {
        element.remove();
    }

    messageElements.delete(key);

    if (replyTarget && replyTarget.key === key) {
        clearReply();
    }

}


/* =========================
   ADMIN LOGIN
========================= */

async function adminLogin() {

    const email = prompt("Enter Admin Email:");

    if (!email) return;

    const password = prompt("Enter Admin Password:");

    if (!password) return;

    try {

        const result = await signInWithEmailAndPassword(
            auth,
            email.trim(),
            password
        );

        if (result.user.uid !== ADMIN_UID) {

            await signOut(auth);

            alert(
                "This account is not the website admin."
            );

            return;

        }

        alert("Admin login successful!");

        location.reload();

    } catch (error) {

        console.error(error);

        alert(
            "Admin login failed. Check email and password."
        );

    }

}


/* =========================
   ADMIN LOGIN BUTTON
========================= */

function setupAdminLogin() {

    const loginButton = $("adminLogin");

    if (!loginButton) return;

    loginButton.onclick = adminLogin;

}


/* =========================
   FIREBASE CHAT
========================= */

let chatStarted = false;

function startChat() {

    if (chatStarted) return;

    const form = $("chatForm");

    const input = $("chatInput");

    const status = $("chatStatus");

    if (!form || !input || !status) return;

    chatStarted = true;

    addChatStyles();

    setupReplyPreview();

    setupContextMenu();


    onAuthStateChanged(
        auth,
        user => {

            if (!user) {

                status.textContent = "Connecting...";

                signInAnonymously(auth)
                    .catch(error => {

                        console.error(error);

                        status.textContent =
                            "Firebase sign-in failed.";

                    });

                return;

            }


            currentUser = user;


            console.log(
                "CURRENT FIREBASE UID:",
                user.uid
            );


            if (user.uid === ADMIN_UID) {

                status.textContent = "Connected • Admin";

            } else {

                status.textContent =
                    "Connected • Live discussion";

            }


            const messagesRef = ref(db, "messages");

            const messagesQuery = query(
                messagesRef,
                orderByChild("timestamp"),
                limitToLast(100)
            );


            onChildAdded(
                messagesQuery,
                snapshot => {

                    addMessage(
                        snapshot.val(),
                        snapshot.key
                    );

                }
            );


            onChildRemoved(
                messagesQuery,
                snapshot => {

                    handleRemovedMessage(snapshot);

                }
            );


            form.onsubmit = async event => {

                event.preventDefault();

                const messageText = input.value.trim();

                if (!messageText) return;

                if (messageText.length > 500) return;


                try {

                    const newMessage = push(messagesRef);

                    const messageData = {
                        uid: user.uid,
                        text: messageText,
                        timestamp: Date.now()
                    };


                    /* REPLY DATA */

                    if (replyTarget) {

                        messageData.replyTo = {
                            key: replyTarget.key,
                            uid: replyTarget.uid,
                            text: replyTarget.text
                        };

                    }


                    await set(
                        newMessage,
                        messageData
                    );

                    input.value = "";

                    clearReply();

                } catch (error) {

                    console.error(error);

                    status.textContent =
                        "Message could not be sent.";

                }

            };

        }
    );

}


/* =========================
   START WEBSITE
========================= */

loadApps();

loadAnnouncements();

setupAdminLogin();

startChat();
