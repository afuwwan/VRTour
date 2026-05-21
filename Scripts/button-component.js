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
                loadSceneDynamic(data.target_url);
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
            overlay.setAttribute('material', {
                shader: 'flat',
                transparent: true,
                opacity: 0,
                depthTest: false
            });
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
        el.setAttribute('material', 'opacity', from);
        
        const startTime = performance.now();
        
        function tick(now) {
            const progress = Math.min((now - startTime) / duration, 1);
            const currentOpacity = from + (to - from) * progress;
            el.setAttribute('material', 'opacity', currentOpacity);
            
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

function cleanCloneElement(element) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = element.outerHTML;
    return tempDiv.firstElementChild;
}

function resolveAssetUrl(doc, srcAttribute) {
    if (srcAttribute.startsWith('#')) {
        const assetId = srcAttribute.substring(1);
        const assetEl = doc.getElementById(assetId);
        if (assetEl) {
            return assetEl.getAttribute('src');
        }
    }
    return srcAttribute;
}

function cloneAndResolveElement(targetDoc, element) {
    const cleanEl = cleanCloneElement(element);
    
    function resolve(el) {
        if (el.hasAttribute('src')) {
            const src = el.getAttribute('src');
            if (src && src.startsWith('#')) {
                const resolved = resolveAssetUrl(targetDoc, src);
                if (resolved) {
                    el.setAttribute('src', resolved);
                }
            }
        }
        
        // Also recursively handle children
        for (let child of el.children) {
            resolve(child);
        }
    }
    
    resolve(cleanEl);
    return cleanEl;
}

async function loadSceneDynamic(url, isPopState = false) {
    console.log("Dynamically transitioning to:", url);
    
    const overlay = getOrCreateFadeOverlay();
    
    // 1. Fade to black
    if (overlay) {
        await animateOpacity(overlay, 0, 1, 300);
    }
    
    try {
        // 2. Fetch the target HTML file
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error("Failed to fetch page: " + response.statusText);
        }
        const htmlText = await response.text();
        
        // 3. Parse the fetched HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, 'text/html');
        const targetScene = doc.querySelector('a-scene');
        
        if (!targetScene) {
            throw new Error("No a-scene found in target page");
        }
        
        // 4. Resolve and update HUD elements in the active camera
        const activeCamera = document.querySelector('a-camera');
        if (activeCamera) {
            // Remove current HUD elements (children that are not the cursor or the fade overlay)
            const cameraChildren = Array.from(activeCamera.children);
            cameraChildren.forEach(child => {
                if (child.id !== 'cursor' && child.id !== 'fade-overlay') {
                    activeCamera.removeChild(child);
                }
            });
            
            // Clone and add target HUD elements
            const targetCamera = targetScene.querySelector('a-camera');
            if (targetCamera) {
                for (let child of targetCamera.children) {
                    if (child.id !== 'cursor' && child.id !== 'fade-overlay') {
                        const cleanChild = cloneAndResolveElement(doc, child);
                        activeCamera.appendChild(cleanChild);
                    }
                }
            }
        }
        
        // 5. Update camera wrapper (parent of a-camera) position/rotation
        if (activeCamera) {
            const activeWrapper = activeCamera.parentElement;
            const targetCamera = targetScene.querySelector('a-camera');
            const targetWrapper = targetCamera ? targetCamera.parentElement : null;
            if (activeWrapper && targetWrapper) {
                if (targetWrapper.hasAttribute('position')) {
                    activeWrapper.setAttribute('position', targetWrapper.getAttribute('position'));
                }
                if (targetWrapper.hasAttribute('rotation')) {
                    activeWrapper.setAttribute('rotation', targetWrapper.getAttribute('rotation'));
                }
            }
        }
        
        // 6. Clean up scene: remove everything except camera wrapper, assets, canvas, and VR overlays
        const activeScene = document.querySelector('a-scene');
        const activeWrapper = activeCamera ? activeCamera.parentElement : null;
        const activeAssets = document.querySelector('a-assets');
        
        const sceneChildren = Array.from(activeScene.children);
        sceneChildren.forEach(child => {
            const tagName = child.tagName.toLowerCase();
            if (
                child !== activeWrapper && 
                tagName !== 'a-assets' && 
                tagName !== 'canvas' && 
                tagName !== 'div' &&
                !child.hasAttribute('data-aframe-default-light')
            ) {
                activeScene.removeChild(child);
            }
        });
        
        // 7. Add new elements from target scene
        for (let child of targetScene.children) {
            const tagName = child.tagName.toLowerCase();
            // Skip camera wrapper, assets, and canvas (which A-Frame injects at runtime)
            if (tagName !== 'a-assets' && tagName !== 'canvas' && !child.querySelector('a-camera')) {
                const cleanChild = cloneAndResolveElement(doc, child);
                activeScene.appendChild(cleanChild);
            }
        }
        
        // 8. Update history if this is not from back/forward buttons
        if (!isPopState) {
            window.history.pushState({}, '', url);
        }

        // Reset cursor and raycaster states to prevent stuck states from deleted elements
        const cursorEl = document.querySelector('#cursor') || document.querySelector('[cursor]');
        if (cursorEl) {
            // Reset geometry to defaults to clear any mid-animation scales
            cursorEl.setAttribute('geometry', {
                primitive: 'ring',
                radiusInner: 0.01,
                radiusOuter: 0.02
            });
            // Stop and play components to reset internal event listeners/states
            if (cursorEl.components && cursorEl.components.cursor) {
                cursorEl.components.cursor.pause();
                cursorEl.components.cursor.intersectedEl = null;
                cursorEl.components.cursor.play();
            }
            if (cursorEl.components && cursorEl.components.raycaster) {
                cursorEl.components.raycaster.pause();
                cursorEl.components.raycaster.refresh();
                cursorEl.components.raycaster.play();
            }
        }
        
        console.log("Successfully transitioned dynamically!");
        
    } catch (err) {
        console.warn("Dynamic transition failed. Falling back to normal navigation:", err);
        // Fallback: standard page navigation
        window.location.href = url;
        return;
    }
    
    // 9. Fade back in
    if (overlay) {
        await animateOpacity(overlay, 1, 0, 300);
    }
}

// Listen for browser back/forward buttons
window.addEventListener('popstate', function () {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    loadSceneDynamic(filename, true);
});