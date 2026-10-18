import { initializeApp }
from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";

import {
    getAuth,
    signInAnonymously
}
from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";

import {
    getDatabase
}
from "https://www.gstatic.com/firebasejs/13.0.0/firebase-database.js";


const firebaseConfig = {

    apiKey:
        "AIzaSyBpTL0rRgxYgKzwWrnrDnzsGadEVZoIRUw",

    authDomain:
        "mods-ka-adda.firebaseapp.com",

    databaseURL:
        "https://mods-ka-adda-default-rtdb.firebaseio.com",

    projectId:
        "mods-ka-adda",

    storageBucket:
        "mods-ka-adda.firebasestorage.app",

    messagingSenderId:
        "883444905856",

    appId:
        "1:883444905856:web:b436fba41fe8d5e1ed7365"
};


const firebaseApp =
    initializeApp(firebaseConfig);

const auth =
    getAuth(firebaseApp);

const db =
    getDatabase(firebaseApp);


export {
    auth,
    db,
    signInAnonymously
};
