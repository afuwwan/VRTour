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
            location.replace(data.target_url);
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

        var target = document.getElementById(data.target_id)

        el.addEventListener('mouseenter', function () {
            console.log("Aim to", data.name);
        })

        el.addEventListener('click', function () {
            console.log("Show Object: ", data.target_id);
            target.setAttribute("visible", true)
        })

        el.addEventListener('mouseleave', function () {
            console.log("Hide Object: ", data.target_id);
            target.setAttribute("visible", false)

        })

    }
});

// Zoom functionality
document.addEventListener('wheel', function(event) {
    var camera = document.querySelector('a-camera');
    var currentFov = camera.getAttribute('camera').fov;
    if (event.deltaY < 0) {
        currentFov = Math.max(30, currentFov - 1);  // Zoom in
    } else {
        currentFov = Math.min(100, currentFov + 1); // Zoom out
    }
    camera.setAttribute('camera', 'fov', currentFov);
});