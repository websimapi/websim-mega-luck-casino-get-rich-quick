class MultiplayerManager {
    constructor() {
        this.room = null;
        this.players = new Map();
        this.init();
    }
    
    async init() {
        try {
            this.room = new WebsimSocket();
            await this.room.initialize();
            
            window.room = this.room; // Make available globally
            
            this.setupEventHandlers();
            this.updatePlayersList();
            
            console.log('Multiplayer initialized');
        } catch (error) {
            console.error('Failed to initialize multiplayer:', error);
        }
    }
    
    setupEventHandlers() {
        this.room.onmessage = (event) => {
            const data = event.data;
            
            switch (data.type) {
                case 'connected':
                    this.addToFeed(`🟢 ${data.username} joined the casino!`);
                    this.updatePlayersList();
                    break;
                    
                case 'disconnected':
                    this.addToFeed(`🔴 ${data.username} left the casino`);
                    this.updatePlayersList();
                    break;
                    
                case 'player_spin':
                    this.addToFeed(`🎲 ${data.username} spent $${data.cost} on a ${data.isMega ? 'MEGA ' : ''}spin!`);
                    break;
                    
                case 'player_win':
                    this.addToFeed(`🎉 ${data.username} won ${data.payout} coins with ${data.symbol}${data.symbol}${data.symbol}!`);
                    this.showWinNotification(data.username, data.payout);
                    break;
                    
                default:
                    console.log('Unknown event:', data);
            }
        };
        
        this.room.subscribePresence((presence) => {
            this.updatePlayersList();
        });
    }
    
    updatePlayersList() {
        const container = document.getElementById('players-container');
        if (!container) return;
        
        container.innerHTML = '';
        
        Object.entries(this.room.peers).forEach(([clientId, peer]) => {
            const playerEl = document.createElement('div');
            playerEl.className = 'player-item';
            
            const isCurrentUser = clientId === this.room.clientId;
            const displayName = isCurrentUser ? `${peer.username} (You)` : peer.username;
            
            playerEl.innerHTML = `
                <img class="player-avatar" src="${peer.avatarUrl}" alt="${peer.username}">
                <div class="player-info">
                    <div class="player-name">${displayName}</div>
                    <div class="player-status">🎰 Playing</div>
                </div>
            `;
            
            container.appendChild(playerEl);
        });
    }
    
    showWinNotification(username, amount) {
        // Create floating notification for big wins
        if (amount > 100) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(45deg, #ffd700, #ffed4a);
                color: #000;
                padding: 15px 25px;
                border-radius: 15px;
                font-weight: bold;
                z-index: 1000;
                animation: slideIn 0.5s ease-out;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            `;
            
            notification.innerHTML = `🎊 ${username} won ${amount} coins! 🎊`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }
    }
    
    addToFeed(message) {
        if (window.game) {
            window.game.addToFeed(message);
        }
    }
}

// Add CSS for slide-in animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .premium-active {
        background: linear-gradient(45deg, #00ff00, #32cd32) !important;
        color: #000 !important;
        animation: none !important;
    }
`;
document.head.appendChild(style);

// Initialize multiplayer when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.multiplayer = new MultiplayerManager();
});