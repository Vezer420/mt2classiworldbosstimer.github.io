let markers = [];

let activePopup = null;
let activePopupViewer = null;

let activeChannel = 1;



document.addEventListener("contextmenu", e => e.preventDefault());

if ("Notification" in window) {
    if (Notification.permission !== "granted") {
        Notification.requestPermission();
    }
}
document.querySelectorAll("#channelBar button").forEach(btn => {
    btn.addEventListener("click", () => {
        setChannel(parseInt(btn.dataset.ch));
    });
});

setInterval(() => {

    markers.forEach(m => {

        const markerEl = m._element;
        if(!markerEl) return;

        const progress = markerEl.querySelector(".cooldown-progress");

        const radius = 45;
        const circumference = 2 * Math.PI * radius;

        const chData = markerEl.channels?.[activeChannel];

        // 🚫 NO TIMER → reset UI
        if(!chData || !chData.endTime){

            progress.style.strokeDashoffset = circumference;
            markerEl.classList.remove("cooling");
            return;
        }

        const remaining = chData.endTime - Date.now();

        // ✅ TIMER FINISHED
        if(remaining <= 0){

            if(!chData.notified){

                chData.notified = true;

                if (Notification.permission === "granted") {
                    new Notification(`${markerEl.type} ready (CH${activeChannel})`);
                }
            }

            chData.endTime = null;

            // 🔥 IMPORTANT: reset UI here too
            progress.style.strokeDashoffset = circumference;
            markerEl.classList.remove("cooling");

        } else {

            const percent = 1 - (remaining / (markerEl.cooldown * 1000));
            const offset = circumference * percent;

            progress.style.strokeDashoffset = circumference - offset;
            markerEl.classList.add("cooling");
        }

    });

}, 100);

function updateChannelUI(){

    document.querySelectorAll("#channelBar button").forEach(btn => {

        const ch = parseInt(btn.dataset.ch);

        btn.classList.toggle("active", ch === activeChannel);
    });

}

function setChannel(ch){
    activeChannel = ch;

    updateChannelUI();

    // force immediate visual refresh
    markers.forEach(m => {

        const marker = m.element;
        if(!marker) return;

        const progress = marker.querySelector(".cooldown-progress");

        const radius = 45;
        const circumference = 2 * Math.PI * radius;

        const chData = marker.channels?.[activeChannel];

        if(!chData || !chData.endTime){
            progress.style.strokeDashoffset = circumference;
            marker.classList.remove("cooling");
            return;
        }

        const remaining = chData.endTime - Date.now();

        if(remaining <= 0){
            progress.style.strokeDashoffset = circumference;
            marker.classList.remove("cooling");
        }
    });
}

function saveMarkers() {
    localStorage.setItem("mapMarkers", JSON.stringify(markers));
}

let editMode = false;

document.getElementById("editToggle").onclick = () => {

    editMode = !editMode;

    document.getElementById("editToggle").innerText =
        editMode ? "Disable Edit Mode" : "Enable Edit Mode";
};

function createMarkerElement(type, cooldown = 30){

    const marker = document.createElement("button");
    marker.className = "marker pin-" + type;

    marker.cooldown = cooldown;
    marker.cooldownInterval = null;

    marker.innerHTML = `
        <span class="label">${''}</span>

        <svg class="cooldown" viewBox="0 0 100 100">
            <circle class="cooldown-bg" cx="50" cy="50" r="45"></circle>
            <circle class="cooldown-progress" cx="50" cy="50" r="45"></circle>
        </svg>
    `;


    marker.type = type;

    marker.data = {
        name: "",
        resist: "",
        location: ""
    };

    marker.channels = {
        1: { endTime: null, notified: false },
        2: { endTime: null, notified: false },
        3: { endTime: null, notified: false },
        4: { endTime: null, notified: false }
    };

    const progress = marker.querySelector(".cooldown-progress");

    const radius = 45;
    const circumference = 2 * Math.PI * radius;

    progress.style.strokeDasharray = circumference;
    progress.style.strokeDashoffset = circumference;

    /*marker.startCooldown = () => {

        const cooldown = marker.cooldown;

        // RESET if already running
        if(marker.cooldownInterval){
            clearInterval(marker.cooldownInterval);
        }

        marker.classList.add("cooling");

        let start = Date.now();

        marker.cooldownInterval = setInterval(()=>{

            let elapsed = (Date.now() - start) / 1000;
            let percent = elapsed / cooldown;

            let offset = circumference * percent;
            progress.style.strokeDashoffset = circumference - offset;

            if(elapsed >= cooldown){

                clearInterval(marker.cooldownInterval);
                marker.cooldownInterval = null;

                progress.style.strokeDashoffset = circumference;
                marker.classList.remove("cooling");

                if (Notification.permission === "granted") {

                    const data = marker.data || {};

                    new Notification("Boss Spawnol!", {
                        body:
                            `Name: ${data.name || "-"}\n` +
                            `Resist: ${data.resist || "-"}\n` +
                            `Location: ${data.location || "-"}`,
                        icon: "boss_icon.png" // optional
                    });
                }

            }

        },16);
    };*/


    marker.startCooldown = () => {

        const ch = marker.channels[activeChannel];

        ch.endTime = Date.now() + marker.cooldown * 1000;
        ch.notified = false;
    };
    return marker;
};

function createViewer(id, image, defaultZoom = 1) {

    const viewer = OpenSeadragon({
        id: id,

        prefixUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/openseadragon/4.1.0/images/",

        tileSources: {
            type: "image",
            url: image
        },

        showNavigator: true,
        zoomPerScroll: 1.3,
        maxZoomPixelRatio: 10,
        visibilityRatio: 1,
        constrainDuringPan: true

    });

    viewer.addHandler("open", function () {
        viewer.viewport.goHome(true);              // fit image
        viewer.viewport.zoomTo(defaultZoom);       // apply custom zoom
    });


    viewer.addHandler("canvas-click", function(){

    if(activePopup && activePopupViewer){
        activePopupViewer.removeOverlay(activePopup);
        activePopup = null;
        activePopupViewer = null;
    }

    });


    const preview = document.createElement("div");
    preview.className = "marker-preview";
    preview.innerText = "Pin";

    let previewAdded = false;

    const tracker = new OpenSeadragon.MouseTracker({
        element: viewer.canvas,

        moveHandler: function(event){

            if(!editMode) return;

            const viewportPoint = viewer.viewport.pointFromPixel(event.position);

            const point = viewer.viewport.pointFromPixel(event.position);

            if(!previewAdded){

                viewer.addOverlay({
                    element: preview,
                    location: point,
                    placement: OpenSeadragon.Placement.CENTER
                });

                previewAdded = true;

            } else {

                viewer.updateOverlay(preview, point);

            }

        }
    });

    tracker.setTracking(true);

    viewer.addHandler("canvas-click", function(event){

        if(!editMode) return;

        event.preventDefaultAction = true;

        const point = viewer.viewport.pointFromPixel(event.position);

        addMarker(viewer,point,id);

    });
    return viewer;
}

async function addMarker(viewer, point, mapId){

    const type = getSelectedPinType();

    const marker = createMarkerElement(type);

    marker.classList.add("openseadragon-no-pan");
    marker.style.pointerEvents = "auto";

    viewer.addOverlay({
        element: marker,
        location: point,
        placement: OpenSeadragon.Placement.CENTER
    });

    new OpenSeadragon.MouseTracker({
        element: marker,

        clickHandler: function(event){

            event.preventDefaultAction = true;
            event.stopPropagation = true;

            // LEFT CLICK → cooldown
            if (event.originalEvent.button === 0) {

                marker.cooldown = 7200; // 2 hours
                marker.startCooldown();
            }
        },

        contextMenuHandler: function(event){

            event.preventDefaultAction = true;
            event.stopPropagation = true;

            // RIGHT CLICK → popup
            openMarkerPopup(viewer, point, type, marker);
        }

    }).setTracking(true);

    marker.classList.add("openseadragon-no-pan");

    await fb.addDoc(
        fb.collection(db, "markers"),
        {
            map: mapId,
            type: type,
            x: point.x,
            y: point.y,
            data: marker.data,
            channels: marker.channels
        }
    );

    //markers.push(markerData);

    // link ONLY in memory (not saved)
    //marker._data = markerData;
    //markerData._element = marker;

    // store element separately (NOT in JSON)
    

    }

function stopOSDKeys(element){
    ["keydown", "keypress", "keyup"].forEach(evt => {
        element.addEventListener(evt, e => e.stopPropagation());
    });
}

function openMarkerPopup(viewer, point, type, marker){

    // close previous popup properly
    if(activePopup && activePopupViewer){
        activePopupViewer.removeOverlay(activePopup);
        activePopup = null;
        activePopupViewer = null;
    }

    const popup = document.createElement("div");
    popup.className = "marker-popup openseadragon-no-pan";

    popup.innerHTML = `
        <div class="popup-content">
            <button class="editBtn">⚙️</button>
            <button class="deleteBtn">X</button>
            <br>
            <div class="dataDisplay">
                <div>Név: ${marker.data.name || "-"}
                Faj: ${marker.data.resist || "-"}</div>
                <div>Hely: ${marker.data.location || "-"}</div>
            </div>
            <br>
            <input type="text" placeholder="H" class="timer" maxlength="1" /> 
            <input type="text" placeholder="MM" class="timer" maxlength="2" />
            <button class="startTimer">OK</button>
            <br>
        </div>
    `;

    const inputs = popup.querySelectorAll(".timer");


    viewer.addOverlay({
        element: popup,
        location: point,
        placement: OpenSeadragon.Placement.TOP
    });

    activePopup = popup;
    activePopupViewer = viewer;

    // Stop events from reaching OpenSeadragon
    popup.addEventListener("pointerdown", e => e.stopPropagation());
    popup.addEventListener("click", e => e.stopPropagation());

    const editBtn = popup.querySelector(".editBtn");
    const deleteBtn = popup.querySelector(".deleteBtn");
    const startBtn = popup.querySelector(".startTimer");

    inputs.forEach(input => {
        input.addEventListener("keydown", e => e.stopPropagation());
    });


    inputs[0].focus(); 
    inputs.forEach((input, index) =>{
         input.addEventListener("input", () => {
         input.value = input.value.replace(/\D/g, '');
         if (input.value.length === input.maxLength) {
             const next = inputs[index + 1];
             if (next) next.focus(); } 
            }); 
        });


    

    startBtn.addEventListener("click", () => {

        const hours = parseInt(inputs[0].value) || 0;
        const minutes = parseInt(inputs[1].value) || 0;

        const seconds = (hours * 3600) + (minutes * 60);

        if(seconds <= 0) return;

        marker.cooldown = seconds;

        // this now resets any existing cooldown
        marker.startCooldown();

    });

    editBtn.addEventListener("click", () => {

        const container = popup.querySelector(".popup-content");

        // prevent duplicate editors
        if (container.querySelector(".editor")) return;

        const editor = document.createElement("div");
        editor.className = "editor";

        editor.innerHTML = `
            <div>
                Név:
                <input type="text" class="nameInput" value="${marker.data.name}">
            </div>
            <div>
                Faj:
                <input type="text" class="resistInput" value="${marker.data.resist}">
            </div>
            <div>
                Hely:
                <input type="text" class="locationInput" value="${marker.data.location}">
            </div>
            <button class="saveEdit">Save</button>
        `;

        container.appendChild(editor);

        const nameInput = editor.querySelector(".nameInput");
        const resistInput = editor.querySelector(".resistInput");
        const locationInput = editor.querySelector(".locationInput");

        ["pointerdown","mousedown","click","keydown","keypress","keyup"].forEach(evt=>{
            editor.addEventListener(evt, e => e.stopPropagation());
        });

        const saveBtn = editor.querySelector(".saveEdit");

        saveBtn.addEventListener("click", async () => {

            marker.data.name = nameInput.value;
            marker.data.resist = resistInput.value;
            marker.data.location = locationInput.value;

            // update display
            const display = popup.querySelector(".dataDisplay");
            display.innerHTML = `
                <div>Név: ${marker.data.name || "-"} -
                Faj: ${marker.data.resist || "-"}</div>
                <div>Hely: ${marker.data.location || "-"}</div>
            `;
            await fb.updateDoc(
                fb.doc(db, "markers", marker._data.id),
                {
                    data: marker.data
                }
            );

            editor.remove();
        });
        

    });

    deleteBtn.addEventListener("click", async () => {
        viewer.removeOverlay(popup);
        activePopup = null;
        activePopupViewer = null;
    });
}


function getSelectedPinType(){
    return document.querySelector('input[name="pinType"]:checked').value;
}

function exportMarkers(){

    const clean = markers.map(m => ({
        map: m.map,
        type: m.type,
        x: m.x,
        y: m.y,
        data: m.data,
        channels: m.channels
    }));

    const data = JSON.stringify(clean, null, 2);

    const blob = new Blob([data], {type: "application/json"});

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "markers.json";
    a.click();

    URL.revokeObjectURL(url);
}
function listenMarkers(viewers){

    fb.onSnapshot(fb.collection(db, "markers"), snapshot => {

        // clear existing markers
        markers.forEach(m => {
            if(m._element){
                m._element.remove();
            }
        });

        markers = [];

        snapshot.forEach(docSnap => {

            const m = docSnap.data();
            m.id = docSnap.id;

            const viewer = viewers[m.map];

            const marker = createMarkerElement(m.type);

            marker.data = m.data || {};
            marker.channels = m.channels || {
                1:{},2:{},3:{},4:{}
            };

            viewer.addOverlay({
                element: marker,
                location: new OpenSeadragon.Point(m.x, m.y),
                placement: OpenSeadragon.Placement.CENTER
            });

            new OpenSeadragon.MouseTracker({
                element: marker,

                clickHandler: function(event){
                    event.preventDefaultAction = true;

                    if(event.originalEvent.button === 0){
                        marker.cooldown = 7200;
                        marker.startCooldown();

                        // 🔄 sync update
                        fb.updateDoc(
                            fb.doc(db, "markers", m.id),
                            { channels: marker.channels }
                        );
                    }
                },

                contextMenuHandler: function(event){
                    event.preventDefaultAction = true;

                    openMarkerPopup(
                        viewer,
                        new OpenSeadragon.Point(m.x,m.y),
                        m.type,
                        marker
                    );
                }

            }).setTracking(true);

            m._element = marker;
            marker._data = m;

            markers.push(m);
        });
    });
}

const viewers = {
    viewer1: createViewer("viewer1","map1.png",0.35),
    viewer2: createViewer("viewer2","map2.png",0.97),
    viewer3: createViewer("viewer3","map3.png",0.7),
    viewer4: createViewer("viewer4","map4.png",0.45)
};

window.addEventListener("firebase-ready", () => {
    listenMarkers(viewers);
});
updateChannelUI();
