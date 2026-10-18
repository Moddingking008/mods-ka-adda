import {
    auth,
    db,
    signInAnonymously
}
from "./firebase.js";


import {
    onAuthStateChanged
}
from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";


import {
    ref,
    query,
    orderByChild,
    limitToLast,
    onChildAdded,
    push,
    set
}
from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";


const $ = id =>
    document.getElementById(id);


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


/* SEARCH */

$("searchInput")
    .addEventListener(
        "input",
        displayApps
    );


/* =========================
   ANNOUNCEMENTS
========================= */

async function loadAnnouncements(){

    const data =
        await loadJSON(
            "data/announcements.json"
        );


    if(!Array.isArray(data) ||
       data.length === 0){

        $("announcements").innerHTML = `

            <div class="empty">

                No announcements yet.

            </div>

        `;

        return;

    }


    $("announcements").innerHTML =
        data.map(item => `

            <article class="announcement">

                <small>
                    ${escapeHTML(
                        item.date || ""
                    )}
                </small>

                <h3>
                    ${escapeHTML(
                        item.title ||
                        "Update"
                    )}
                </h3>

                <p>
                    ${escapeHTML(
                        item.text ||
                        ""
                    )}
                </p>

            </article>

        `).join("");

}


/* =========================
   CHAT
========================= */

function userName(uid){

    return "User-" +
        String(uid)
        .slice(-4)
        .toUpperCase();

}


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


function addMessage(data){

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


    box.appendChild(
        message
    );


    box.scrollTop =
        box.scrollHeight;

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


    signInAnonymously(auth)
        .catch(() => {

            status.textContent =
                "Firebase sign-in failed.";

        });


    onAuthStateChanged(
        auth,
        user => {

            if(!user){

                status.textContent =
                    "Connecting...";

                return;

            }

            console.log("MY FIREBASE UID:", user.uid);


            status.textContent =
                "Connected • Live discussion";


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
                        snapshot.val()
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

startChat();
