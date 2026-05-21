// Dynamic Scene Navigation - Keeps VR mode active across location changes
class DynamicNavigationManager {
    constructor() {
        this.currentRoom = null;
        this.roomsData = null;
        this.scene = null;
        this.assets = null;
        this.sky = null;
        this.init();
    }

    async init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.scene = document.querySelector('a-scene');
        if (!this.scene) {
            console.warn("A-Frame scene not found");
            return;
        }

        // Wait for A-Frame to fully initialize
        this.scene.addEventListener('loaded', () => {
            this.loadRoomsData();
        });

        if (this.scene.hasLoaded) {
            this.loadRoomsData();
        }
    }

    async loadRoomsData() {
        try {
            const response = await fetch('./data/rooms.json');
            this.roomsData = await response.json();
            console.log("Rooms data loaded successfully");
            
            // Load initial room from URL hash or default
            const initialRoom = window.location.hash.slice(1) || this.roomsData.defaultRoom;
            this.loadRoom(initialRoom);
            
            // Handle hash changes
            window.addEventListener('hashchange', () => {
                const roomId = window.location.hash.slice(1);
                if (roomId) {
                    this.loadRoom(roomId);
                }
            });
        } catch (error) {
            console.error("Failed to load rooms data:", error);
        }
    }

    loadRoom(roomId) {
        if (!this.roomsData || !this.roomsData.rooms[roomId]) {
            console.warn(`Room ${roomId} not found`);
            return;
        }

        const roomData = this.roomsData.rooms[roomId];
        console.log(`Loading room: ${roomId}`);
        
        this.currentRoom = roomId;

        // Update camera rotation
        const cameraEntity = document.querySelector('a-entity[position="0 0 0"]');
        if (cameraEntity && roomData.cameraRotation) {
            cameraEntity.setAttribute('rotation', roomData.cameraRotation);
        }

        // Update background
        this.updateSkyImage(roomData.bg);

        // Update navigation items
        this.updateNavigationItems(roomData.items);
    }

    updateSkyImage(imagePath) {
        const bgImg = document.getElementById('bg');
        if (bgImg) {
            bgImg.setAttribute('src', imagePath);
        }

        const sky = document.querySelector('a-sky');
        if (sky) {
            sky.setAttribute('src', '#bg');
        }
    }

    updateNavigationItems(items) {
        // Remove existing items (keep cursor and HUD)
        const existingItems = document.querySelectorAll('[id^="item"]');
        existingItems.forEach(item => {
            // Only remove if it's a navigation item (not camera/cursor related)
            if (item.getAttribute('id').startsWith('item')) {
                item.remove();
            }
        });

        // Add new items
        items.forEach(itemData => {
            const itemEntity = this.createNavigationItem(itemData);
            this.scene.appendChild(itemEntity);
        });
    }

    createNavigationItem(itemData) {
        // Create main entity
        const entity = document.createElement('a-entity');
        entity.setAttribute('id', itemData.id);
        entity.setAttribute('position', itemData.position);
        entity.setAttribute('rotation', itemData.rotation);

        // Create button image
        const buttonImg = document.createElement('a-image');
        buttonImg.classList.add('itemButton');
        buttonImg.setAttribute('src', '#arrow');
        buttonImg.setAttribute('transparent', 'true');
        buttonImg.setAttribute('position', itemData.button.position);
        buttonImg.setAttribute('rotation', itemData.button.rotation);
        buttonImg.setAttribute('hoverable', 'color:#db4035');
        buttonImg.setAttribute('clickable', `name:${itemData.button.name}; target_room:${itemData.button.target}`);
        buttonImg.setAttribute('scale', '1.5 1.5 1.5');

        // Create text
        const textEntity = document.createElement('a-text');
        textEntity.setAttribute('font', 'kelsonsans');
        textEntity.setAttribute('width', '6');
        textEntity.setAttribute('align', 'center');
        textEntity.setAttribute('value', itemData.text);
        textEntity.setAttribute('position', itemData.textPosition);
        textEntity.setAttribute('rotation', itemData.textRotation);
        textEntity.setAttribute('color', 'white');

        entity.appendChild(buttonImg);
        entity.appendChild(textEntity);

        return entity;
    }

    navigateToRoom(roomId) {
        if (this.currentRoom !== roomId) {
            window.location.hash = roomId;
        }
    }
}

// Initialize when document loads
let navigationManager = null;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        navigationManager = new DynamicNavigationManager();
    });
} else {
    navigationManager = new DynamicNavigationManager();
}
