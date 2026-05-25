AFRAME.registerComponent('hoverable', {
    schema: {
        color: {default: 'red'}
    },

    init: function(){
        var data = this.data;
        var el = this.el;
        var defaultColor = el.getAttribute('material').color;

        el.addEventListener('mouseenter', function () {
            console.log("Mouse Hover");
            el.setAttribute("material", {color: data.color})
        })

        el.addEventListener('mouseleave', function () {
            console.log("Mouse Leave");
            el.setAttribute("material", {color: defaultColor})
        })
    }
});

AFRAME.registerComponent('clickable', {
    schema: {
        name: {type: 'string', default: "nameless"},
        target_url: {type: 'string', default: ""}
    },

    init: function(){
        var self = this;
        var data = self.data;
        var el = this.el;

        el.addEventListener('mouseenter', function () {
            console.log("Aim to", data.name);
        })

        el.addEventListener('click', function () {
            console.log("Go to", data.target_url);
            if (data.target_url) {
                // Update hash to trigger scene render without page reload
                window.location.hash = data.target_url;
            }
        })

    }
});

AFRAME.registerComponent('info-block', {
    schema: {
        name: {type: 'string', default: "nameless"},
        target_id: {type: 'string', default: "unknown"}
    },

    init: function(){
        var self = this;
        var data = self.data;
        var el = this.el;

        el.addEventListener('mouseenter', function () {
            console.log("Aim to", data.name);
        })

        el.addEventListener('click', function () {
            console.log("Show Object: ", data.target_id);
            var target = document.getElementById(data.target_id);
            if (target) {
                target.setAttribute("visible", true);
            }
        })

        el.addEventListener('mouseleave', function () {
            console.log("Hide Object: ", data.target_id);
            var target = document.getElementById(data.target_id);
            if (target) {
                target.setAttribute("visible", false);
            }
        })

    }
});

// Zoom functionality
document.addEventListener('wheel', function(event) {
    var camera = document.querySelector('a-camera');
    if (!camera) return;
    var cameraComp = camera.getAttribute('camera');
    var currentFov = cameraComp ? cameraComp.fov : 80;
    if (event.deltaY < 0) {
        currentFov = Math.max(30, currentFov - 1);  // Zoom in
    } else {
        currentFov = Math.min(100, currentFov + 1); // Zoom out
    }
    camera.setAttribute('camera', 'fov', currentFov);
});

// Dynamic Loader logic to maintain WebXR Session across room transitions
function getOrCreateFadeOverlay() {
    let overlay = document.getElementById('fade-overlay');
    if (!overlay) {
        const camera = document.querySelector('a-camera');
        if (camera) {
            overlay = document.createElement('a-plane');
            overlay.setAttribute('id', 'fade-overlay');
            overlay.setAttribute('position', '0 0 -0.1');
            overlay.setAttribute('width', '2');
            overlay.setAttribute('height', '2');
            overlay.setAttribute('color', 'black');
            overlay.setAttribute('material', 'shader: flat; transparent: true; opacity: 0; depthTest: false');
            overlay.setAttribute('visible', false);
            camera.appendChild(overlay);
        }
    }
    return overlay;
}

function animateOpacity(el, from, to, duration) {
    return new Promise((resolve) => {
        if (!el) {
            resolve();
            return;
        }
        el.setAttribute('visible', true);
        el.setAttribute('material', { opacity: from });
        
        const startTime = performance.now();
        
        function tick(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const currentOpacity = from + (to - from) * progress;
            el.setAttribute('material', { opacity: currentOpacity });
            
            if (progress < 1) {
                requestAnimationFrame(tick);
            } else {
                if (to === 0) {
                    el.setAttribute('visible', false);
                }
                resolve();
            }
        }
        
        requestAnimationFrame(tick);
    });
}

function resetCursor() {
    const cursorEl = document.querySelector('#cursor') || document.querySelector('[cursor]');
    if (cursorEl) {
        cursorEl.setAttribute('geometry', {
            primitive: 'ring',
            radiusInner: 0.01,
            radiusOuter: 0.02
        });
        
        // Force A-Frame raycaster component to refresh its target object cache
        cursorEl.setAttribute('raycaster', 'objects', '.itemButton, .itemInfo');
        
        if (cursorEl.components && cursorEl.components.cursor) {
            cursorEl.components.cursor.pause();
            cursorEl.components.cursor.intersectedEl = null;
            cursorEl.components.cursor.play();
        }
        if (cursorEl.components && cursorEl.components.raycaster) {
            cursorEl.components.raycaster.pause();
            if (typeof cursorEl.components.raycaster.refreshObjects === 'function') {
                cursorEl.components.raycaster.refreshObjects();
            }
            cursorEl.components.raycaster.play();
        }
    }
}

async function renderTourScene(sceneId) {
    console.log("SPA rendering scene:", sceneId);
    
    // Check if TOUR_DATA is available
    if (typeof TOUR_DATA === 'undefined') {
        console.error("TOUR_DATA is not defined. Make sure Scripts/tour-data.js is loaded.");
        return;
    }
    
    const data = TOUR_DATA[sceneId];
    if (!data) {
        console.error("No data found for scene:", sceneId);
        return;
    }
    
    const overlay = getOrCreateFadeOverlay();
    if (overlay) {
        await animateOpacity(overlay, 0, 1, 250);
    }
    
    try {
        const activeScene = document.querySelector('a-scene');
        const activeCamera = document.querySelector('a-camera');
        const activeWrapper = activeCamera ? activeCamera.parentElement : null;
        
        // 1. Update sky background
        const skyEl = document.querySelector('a-sky');
        if (skyEl && data.skySrc) {
            skyEl.setAttribute('src', data.skySrc);
        }
        
        // 2. Update camera wrapper position/rotation
        if (activeWrapper && data.cameraWrapper) {
            activeWrapper.setAttribute('position', data.cameraWrapper.position);
            activeWrapper.setAttribute('rotation', data.cameraWrapper.rotation);
        }
        
        // 3. Clear old dynamic elements from scene (keeping sky, wrapper, canvas, and overlays)
        const children = Array.from(activeScene.children);
        children.forEach(child => {
            const tagName = child.tagName.toLowerCase();
            if (
                child !== activeWrapper &&
                tagName !== 'a-sky' &&
                tagName !== 'a-assets' &&
                tagName !== 'canvas' &&
                tagName !== 'div' &&
                !child.hasAttribute('data-aframe-default-light')
            ) {
                activeScene.removeChild(child);
            }
        });
        
        // 4. Clear old HUD elements from camera (except cursor and overlay)
        if (activeCamera) {
            const cameraChildren = Array.from(activeCamera.children);
            cameraChildren.forEach(child => {
                if (child.id !== 'cursor' && child.id !== 'fade-overlay') {
                    activeCamera.removeChild(child);
                }
            });
        }
        
        // 5. Render Welcome text
        if (data.welcomeText && data.welcomeText.text) {
            const textWrap = document.createElement('a-entity');
            textWrap.setAttribute('id', data.welcomeText.id);
            textWrap.setAttribute('position', data.welcomeText.position);
            textWrap.setAttribute('rotation', data.welcomeText.rotation);
            
            const textEl = document.createElement('a-text');
            const txtData = data.welcomeText.text;
            textEl.setAttribute('value', txtData.value);
            textEl.setAttribute('position', txtData.position);
            textEl.setAttribute('rotation', txtData.rotation);
            textEl.setAttribute('width', txtData.width);
            textEl.setAttribute('align', txtData.align);
            textEl.setAttribute('font', txtData.font);
            
            textWrap.appendChild(textEl);
            activeScene.appendChild(textWrap);
        }
        
        // 6. Render Navigation items
        if (data.navs) {
            data.navs.forEach(nav => {
                const navWrap = document.createElement('a-entity');
                navWrap.setAttribute('id', nav.id);
                navWrap.setAttribute('position', nav.position);
                navWrap.setAttribute('rotation', nav.rotation);
                navWrap.setAttribute('scale', nav.scale);
                
                if (nav.button) {
                    const imgEl = document.createElement('a-image');
                    imgEl.setAttribute('class', 'itemButton');
                    imgEl.setAttribute('src', nav.button.src);
                    imgEl.setAttribute('position', nav.button.position);
                    imgEl.setAttribute('rotation', nav.button.rotation);
                    imgEl.setAttribute('scale', nav.button.scale);
                    imgEl.setAttribute('transparent', 'true');
                    
                    if (nav.button.hoverable) {
                        imgEl.setAttribute('hoverable', `color: ${nav.button.hoverable.color || 'red'}`);
                    }
                    if (nav.button.clickable) {
                        imgEl.setAttribute('clickable', `name: ${nav.button.clickable.name || 'nameless'}; target_url: ${nav.button.clickable.target_url || ''}`);
                    }
                    
                    navWrap.appendChild(imgEl);
                }
                
                if (nav.text) {
                    const textEl = document.createElement('a-text');
                    textEl.setAttribute('value', nav.text.value);
                    textEl.setAttribute('position', nav.text.position);
                    textEl.setAttribute('rotation', nav.text.rotation);
                    textEl.setAttribute('scale', nav.text.scale);
                    textEl.setAttribute('color', nav.text.color);
                    textEl.setAttribute('font', nav.text.font);
                    textEl.setAttribute('width', nav.text.width);
                    textEl.setAttribute('align', nav.text.align);
                    
                    navWrap.appendChild(textEl);
                }
                
                activeScene.appendChild(navWrap);
            });
        }
        
        // 7. Render Specimen Hotspots
        if (data.specimens) {
            data.specimens.forEach(spec => {
                const specWrap = document.createElement('a-entity');
                specWrap.setAttribute('id', spec.id);
                specWrap.setAttribute('position', spec.position);
                specWrap.setAttribute('rotation', spec.rotation);
                specWrap.setAttribute('scale', spec.scale);
                
                if (spec.plane) {
                    const planeEl = document.createElement('a-plane');
                    planeEl.setAttribute('class', 'itemInfo');
                    planeEl.setAttribute('position', spec.plane.position);
                    planeEl.setAttribute('rotation', spec.plane.rotation);
                    planeEl.setAttribute('width', spec.plane.width);
                    planeEl.setAttribute('height', spec.plane.height);
                    planeEl.setAttribute('opacity', spec.plane.opacity);
                    planeEl.setAttribute('color', spec.plane.color);
                    
                    if (spec.plane.infoBlock) {
                        planeEl.setAttribute('info-block', `name: ${spec.plane.infoBlock.name || 'nameless'}; target_id: ${spec.plane.infoBlock.target_id || 'unknown'}`);
                    }
                    
                    if (spec.plane.texts) {
                        spec.plane.texts.forEach(txt => {
                            const textEl = document.createElement('a-text');
                            textEl.setAttribute('value', txt.value);
                            textEl.setAttribute('position', txt.position);
                            textEl.setAttribute('rotation', txt.rotation);
                            textEl.setAttribute('scale', txt.scale);
                            textEl.setAttribute('width', txt.width);
                            textEl.setAttribute('align', txt.align);
                            
                            planeEl.appendChild(textEl);
                        });
                    }
                    
                    specWrap.appendChild(planeEl);
                }
                
                activeScene.appendChild(specWrap);
            });
        }
        
        // 8. Render HUD Panels inside active camera
        if (activeCamera && data.huds) {
            data.huds.forEach(hud => {
                const hudWrap = document.createElement('a-entity');
                hudWrap.setAttribute('id', hud.id);
                hudWrap.setAttribute('position', hud.position);
                hudWrap.setAttribute('rotation', hud.rotation);
                hudWrap.setAttribute('scale', hud.scale);
                hudWrap.setAttribute('visible', 'false');
                
                if (hud.plane) {
                    const planeEl = document.createElement('a-plane');
                    planeEl.setAttribute('position', hud.plane.position);
                    planeEl.setAttribute('rotation', hud.plane.rotation);
                    planeEl.setAttribute('width', hud.plane.width);
                    planeEl.setAttribute('height', hud.plane.height);
                    planeEl.setAttribute('color', hud.plane.color);
                    
                    if (hud.plane.image) {
                        const imgEl = document.createElement('a-image');
                        imgEl.setAttribute('src', hud.plane.image.src);
                        imgEl.setAttribute('position', hud.plane.image.position);
                        imgEl.setAttribute('rotation', hud.plane.image.rotation);
                        imgEl.setAttribute('width', hud.plane.image.width);
                        imgEl.setAttribute('height', hud.plane.image.height);
                        
                        planeEl.appendChild(imgEl);
                    }
                    
                    hudWrap.appendChild(planeEl);
                }
                
                activeCamera.appendChild(hudWrap);
            });
        }
        
        // 9. Reset cursor to avoid stuck state
        resetCursor();
        
    } catch (err) {
        console.error("Error rendering SPA tour scene:", err);
    }
    
    if (overlay) {
        await animateOpacity(overlay, 1, 0, 250);
    }
}

// Initialise hash routing when DOM and A-Frame are loaded
function initSPA() {
    console.log("SPA Engine initialized. Active hash:", window.location.hash);
    
    // Listen for hash changes
    window.addEventListener('hashchange', () => {
        const sceneId = window.location.hash.substring(1) || 'index.html';
        renderTourScene(sceneId);
    });
    
    // Load initial scene
    const initialScene = window.location.hash.substring(1) || 'index.html';
    if (initialScene !== 'index.html') {
        renderTourScene(initialScene);
    } else {
        // Prepare overlay for first dynamic transition
        getOrCreateFadeOverlay();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const sceneEl = document.querySelector('a-scene');
        if (sceneEl) {
            if (sceneEl.hasLoaded) initSPA();
            else sceneEl.addEventListener('loaded', initSPA);
        }
    });
} else {
    const sceneEl = document.querySelector('a-scene');
    if (sceneEl) {
        if (sceneEl.hasLoaded) initSPA();
        else sceneEl.addEventListener('loaded', initSPA);
    }
}