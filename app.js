const params =
    new URLSearchParams(
        window.location.search
    );


const id =
    Number(
        params.get("id")
    );


const box =
    document.getElementById(
        "appDetail"
    );


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


async function loadApp(){

    try{

        const response =
            await fetch(
                "data/apps.json?v=" +
                Date.now()
            );


        const apps =
            await response.json();


        const app =
            apps[id];


        if(!app)
            throw new Error();


        const image =
            app.image ||
            app.logo ||
            app.icon ||
            "images/apps/placeholder.svg";


        const link =
            app.download ||
            app.link ||
            "";


        box.innerHTML = `

            <div class="app-card"
                 style="padding:25px">

                <img
                    class="app-image"
                    style="
                        width:110px;
                        height:110px;
                    "
                    src="${escapeHTML(image)}"
                    onerror="this.src='images/apps/placeholder.svg'"
                    alt=""
                >


                <div
                    style="
                        margin-top:20px;
                        color:#20e49a;
                        font-size:11px;
                        font-weight:bold;
                        letter-spacing:2px;
                    ">

                    ${escapeHTML(
                        app.category ||
                        "APP"
                    )}

                </div>


                <h1
                    style="
                        font-size:38px;
                        margin-top:8px;
                    ">

                    ${escapeHTML(
                        app.name ||
                        "Untitled App"
                    )}

                </h1>


                <p
                    style="
                        color:#8799ae;
                        line-height:1.7;
                        margin-top:18px;
                    ">

                    ${escapeHTML(
                        app.description ||
                        app.desc ||
                        "No description available."
                    )}

                </p>


                <div class="app-info"
                     style="
                        margin-top:20px;
                        font-size:14px;
                     ">

                    <b>Version:</b>
                    ${escapeHTML(
                        app.version ||
                        "—"
                    )}

                    <br>

                    <b>Size:</b>
                    ${escapeHTML(
                        app.size ||
                        "—"
                    )}

                    <br>

                    <b>Android:</b>
                    ${escapeHTML(
                        app.android ||
                        "—"
                    )}

                    <br>

                    <b>Rating:</b>
                    ⭐
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

                        ${escapeHTML(
                            app.mod
                        )}

                    </span>
                    `
                    :
                    ""
                }


                ${
                    link
                    ?
                    `
                    <a
                        href="${escapeHTML(link)}"
                        target="_blank"
                        rel="noopener"
                        class="btn primary"
                        style="
                            width:100%;
                            margin-top:25px;
                        ">

                        Open / Download

                    </a>
                    `
                    :
                    ""
                }

            </div>

        `;


    }catch(error){

        box.innerHTML = `

            <div class="empty">

                App not found.

                <br><br>

                <a
                    href="index.html#apps"
                    class="btn primary">

                    Go Back

                </a>

            </div>

        `;

    }

}


loadApp();
