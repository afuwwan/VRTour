// VR State Manager - Preserves VR mode across page navigations
(function() {
    // Re-enter VR mode on page load if it was previously active
    function checkAndRestoreVRMode() {
        var vrWasActive = sessionStorage.getItem('vrModeActive');
        
        if (vrWasActive === 'true') {
            console.log("VR mode was active - attempting to restore...");
            
            // Wait for A-Frame to fully load the scene
            var scene = document.querySelector('a-scene');
            
            if (scene) {
                // Use A-Frame's enterVR method when available
                scene.addEventListener('loaded', function() {
                    console.log("Scene loaded - entering VR mode");
                    if (scene.enterVR) {
                        scene.enterVR();
                    } else {
                        // Fallback: try to trigger the VR button
                        requestAnimationFrame(function() {
                            if (scene.enterVR) {
                                scene.enterVR();
                            }
                        });
                    }
                    sessionStorage.removeItem('vrModeActive');
                });
                
                // If scene is already loaded
                if (scene.hasLoaded) {
                    console.log("Scene already loaded - entering VR mode immediately");
                    if (scene.enterVR) {
                        scene.enterVR();
                    }
                    sessionStorage.removeItem('vrModeActive');
                }
            }
        }
    }
    
    // Clear VR state when user explicitly exits
    document.addEventListener('DOMContentLoaded', function() {
        var scene = document.querySelector('a-scene');
        if (scene) {
            scene.addEventListener('exit-vr', function() {
                console.log("User exited VR mode");
                sessionStorage.removeItem('vrModeActive');
            });
        }
    });
    
    // Check and restore VR mode when page loads
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAndRestoreVRMode);
    } else {
        checkAndRestoreVRMode();
    }
})();
