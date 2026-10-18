import {
    auth,
    db,
    signInAnonymously
}
from "./firebase.js";


import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut
}
from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";


import {
    ref,
    query,
    orderByChild,
    limitToLast,
    onChildAdded,
    push,
    set,
    remove
}
from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";


const $ = id =>
    document.getElementById(id);


/* =========================
   ADMIN
========================= */

const ADMIN_UID =
    "1Y1jqM92OuWYXPvPqkqTU8epe8G3";


let currentUser = null;


/* =========================
   APP DATA
========================= */

let apps = [];

let selectedCategory = "All";


/* =========================
   SAFE HTML
========================= */

function escapeHTML(value){

    return String(value ?? "")
        .replace(/[&<>"']/g, char => {

            const map = {

                "&":"&amp;",
                "<":"&lt;",
                ">":"&gt;",
                '"':"&quot;",
                "'":"&#039;"

            };

            return map[char];

        });

}


/* =========================
   LOAD JSON
========================= */

async function loadJSON(file){

    try{

        const response =
            await fetch(
                file + "?v=" + Date.now()
            );

        if(!response.ok)
            throw new Error();

        return await response.json();

    }catch(error){

        console.error(
            "JSON load failed:",
            file,
            error
        );

        return [];

    }

}


/* =========================
   APPS
========================= */

async function loadApps(){

    apps =
        await loadJSON(
            "data/apps.json"
        );

    if(!Array.isArray(apps))
        apps=[];


    createCategories();

    displayApps();

}


/* =========================
   CATEGORIES
========================= */

function createCategories(){

    const categories = [

        "All",

        ...new Set(

            apps.map(
                app =>
                app.category || "Other"
            )

        )

    ];


    $("categoryBar").innerHTML =
        categories.map(category => `

            <button
                class="category ${
                    category === selectedCategory
                    ? "active"
                    : ""
                }"
                data-category="${escapeHTML(category)}">

                ${escapeHTML(category)}

            </button>

        `).join("");


    document
        .querySelectorAll(".category")
        .forEach(button => {

            button.onclick = () => {

                selectedCategory =
                    button.dataset.category;

                createCategories();

                displayApps();

            };

        });

}


/* =========================
   DISPLAY APPS
========================= */

function displayApps(){

    const search =
        $("searchInput")
        .value
        .trim()
        .toLowerCase();


    const filtered =
        apps.filter(app => {

            const name =
                String(app.name || "")
                .toLowerCase();

            const category =
                app.category || "Other";


            const categoryMatch =
                selectedCategory === "All" ||
                category === selectedCategory;


            const searchMatch =
                !search ||
                name.includes(search) ||
                category
                    .toLowerCase()
                    .includes(search);


            return categoryMatch &&
                   searchMatch;

        });


    $("appCount").textContent =
        `${apps.length} App${apps.length === 1 ? "" : "s"}`;


    $("appGrid").innerHTML =
        filtered.map(app => {

            const index =
                apps.indexOf(app);


            const image =
                app.image ||
                app.logo ||
                app.icon ||
                "images/apps/placeholder.svg";


            const download =
                app.download ||
                app.link ||
                "";


            return `

                <article class="app-card">

                    <img
                        class="app-image"
                        src="${escapeHTML(image)}"
                        onerror="this.src='images/apps/placeholder.svg'"
                        alt=""
                    >

                    <h3>
                        ${escapeHTML(
                            app.name ||
                            "Untitled App"
                        )}
                    </h3>

                    <div class="app-info">

                        v${escapeHTML(
                            app.version ||
                            "Latest"
                        )}

                        •

                        ${escapeHTML(
                            app.size ||
                            "—"
                        )}

                        <br>

                        ${escapeHTML(
                            app.category ||
                            "Other"
                        )}

                        • ⭐

                        ${escapeHTML(
                            app.rating ??
                            "—"
                        )}

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
                                rel="noopener">

                                Open

                            </a>
                            `
                            :
                            ""
                        }

                    </div>

                </article>

            `;

        }).join("");


    $("emptyApps")
        .style.display =
        filtered.length
        ? "none"
        : "block";

}


/* =========================
   SEARCH
========================= */

$("searchInput")
    .addEventListener(
        "input",
        displayApps
    );


/* =========================
   MOVING ANNOUNCEMENTS
========================= */

function makeAnnouncementHTML(data){

    if(
        !Array.isArray(data) ||
        data.length === 0
    ){

        return `

            <div class="moving-announcement-item">

                No announcements yet.

            </div>

        `;

    }


    return data.map(item => {

        const title =
            escapeHTML(
                item.title ||
                "Update"
            );


        const text =
            String(
                item.text ||
                ""
            );


        /*
         * Complete text ko safe HTML banate hain.
         */

        let safeText =
            escapeHTML(text);


        /*
         * HTTPS URLs ko clickable link
         * banaya jayega.
         *
         * URL ke aage aur peeche
         * space bhi rahega.
         */

        safeText =
            safeText.replace(
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


async function loadAnnouncements(){

    const track =
        $("announcementTrack");


    if(!track)
        return;


    const data =
        await loadJSON(
            "data/announcements.json"
        );


    const content =
        makeAnnouncementHTML(data);


    /*
     * Same content ki 2 copies.
     *
     * CSS animation -50% tak jayegi,
     * isliye loop smooth rahega.
     */

    track.innerHTML =
        content + content;

}


/* =========================
   CHAT USER NAME
========================= */

function userName(uid){

    if(uid === ADMIN_UID)
        return "ADMIN";


    return "User-" +
        String(uid)
        .slice(-4)
        .toUpperCase();

}


/* =========================
   TIME
========================= */

function timeFormat(timestamp){

    if(!timestamp)
        return "";

    return new Date(timestamp)
        .toLocaleTimeString(
            [],
            {
                hour:"2-digit",
                minute:"2-digit"
            }
        );

}


/* =========================
   ADD MESSAGE
========================= */

function addMessage(data, messageKey){

    const box =
        $("chatMessages");


    const loading =
        box.querySelector(
            ".chat-loading"
        );


    if(loading)
        loading.remove();


    const message =
        document.createElement(
            "div"
        );

    message.className =
        "message";


    const user =
        document.createElement(
            "div"
        );

    user.className =
        "message-user";

    user.textContent =
        userName(
            data.uid ||
            "0000"
        );


    const text =
        document.createElement(
            "div"
        );

    text.className =
        "message-text";

    text.textContent =
        data.text || "";


    const time =
        document.createElement(
            "div"
        );

    time.className =
        "message-time";

    time.textContent =
        timeFormat(
            data.timestamp
        );


    message.append(
        user,
        text,
        time
    );


    /* =========================
       ADMIN DELETE
    ========================= */

    if(
        currentUser &&
        currentUser.uid === ADMIN_UID &&
        messageKey
    ){

        const deleteButton =
            document.createElement(
                "button"
            );


        deleteButton.type =
            "button";


        deleteButton.className =
            "admin-delete";


        deleteButton.textContent =
            "Delete";


        deleteButton.onclick =
            async () => {

                const confirmed =
                    confirm(
                        "Delete this message?"
                    );


                if(!confirmed)
                    return;


                try{

                    await remove(
                        ref(
                            db,
                            "messages/" +
                            messageKey
                        )
                    );


                    message.remove();


                }catch(error){

                    console.error(
                        error
                    );

                    alert(
                        "Delete failed."
                    );

                }

            };


        message.append(
            deleteButton
        );

    }


    box.appendChild(
        message
    );


    box.scrollTop =
        box.scrollHeight;

}


/* =========================
   ADMIN LOGIN
========================= */

async function adminLogin(){

    const email =
        prompt(
            "Enter Admin Email:"
        );


    if(!email)
        return;


    const password =
        prompt(
            "Enter Admin Password:"
        );


    if(!password)
        return;


    try{

        const result =
            await signInWithEmailAndPassword(
                auth,
                email.trim(),
                password
            );


        if(
            result.user.uid !==
            ADMIN_UID
        ){

            await signOut(auth);

            alert(
                "This account is not the website admin."
            );

            return;

        }


        alert(
            "Admin login successful!"
        );


        location.reload();


    }catch(error){

        console.error(error);

        alert(
            "Admin login failed. Check email and password."
        );

    }

}


/* =========================
   ADMIN LOGIN BUTTON
========================= */

function setupAdminLogin(){

    const loginButton =
        $("adminLogin");


    if(!loginButton)
        return;


    loginButton.onclick =
        adminLogin;

}


/* =========================
   FIREBASE CHAT
========================= */

function startChat(){

    const form =
        $("chatForm");

    const input =
        $("chatInput");

    const status =
        $("chatStatus");


    onAuthStateChanged(
        auth,
        user => {

            if(!user){

                status.textContent =
                    "Connecting...";


                signInAnonymously(auth)
                    .catch(() => {

                        status.textContent =
                            "Firebase sign-in failed.";

                    });


                return;

            }


            currentUser =
                user;


            console.log(
                "CURRENT FIREBASE UID:",
                user.uid
            );


            if(
                user.uid ===
                ADMIN_UID
            ){

                status.textContent =
                    "Connected • Admin";

            }else{

                status.textContent =
                    "Connected • Live discussion";

            }


            const messagesRef =
                ref(
                    db,
                    "messages"
                );


            const messagesQuery =
                query(
                    messagesRef,
                    orderByChild(
                        "timestamp"
                    ),
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


            form.onsubmit =
                async event => {

                    event.preventDefault();


                    const text =
                        input.value.trim();


                    if(!text)
                        return;


                    if(text.length > 500)
                        return;


                    try{

                        const newMessage =
                            push(
                                messagesRef
                            );


                        await set(
                            newMessage,
                            {

                                uid:
                                    user.uid,

                                text:
                                    text,

                                timestamp:
                                    Date.now()

                            }
                        );


                        input.value = "";


                    }catch(error){

                        console.error(
                            error
                        );


                        status.textContent =
                            "Message could not be sent.";

                    }

                };

        }
    );

}


/* =========================
   START
========================= */

loadApps();

loadAnnouncements();

setupAdminLogin();

startChat();
