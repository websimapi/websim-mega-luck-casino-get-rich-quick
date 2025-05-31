class MultiplayerManager {
    constructor() {
        this.room = null;
        // this.players = new Map(); // Not strictly needed if using room.peers and room.presence directly
        this.init();
    }
    
    async init() {
        try {
            this.room = new WebsimSocket();
            await this.room.initialize();
            
            window.room = this.room; // Make available globally
            
            // Initial presence should be set by game.js after room is ready
            // Example: if game class sets initial money/coins, it should also updatePresence.

            this.setupEventHandlers();
            this.updatePlayersList(); // Initial call
            
            console.log('Multiplayer initialized. Client ID:', this.room.clientId);
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
                    this.addToFeed(`🎉 ${data.username} won ${data.payout.toLocaleString()} coins with ${data.symbol}${data.symbol}${data.symbol}!`);
                    this.showWinNotification(data.username, data.payout);
                    break;
                    
                default:
                    console.log('Unknown event:', data);
            }
        };
        
        // Subscribe to presence changes to update UI elements that depend on other players' states
        // (e.g., leaderboards, or if the "Recent Big Winners" list should reflect actual player data)
        this.room.subscribePresence((presence) => {
            this.updatePlayersList();
            // If game logic needs to react to aggregated presence data (other than rate calculation), handle here
            if (window.game && window.game.gameInitialized) {
                // For instance, if a global stats display needs updating
            }
        });

        // Room state changes (like exchange rate) are handled by game.js subscribing directly
    }
    
    updatePlayersList() {
        if (!this.room || !this.room.peers) return; // Ensure room and peers are available

        const container = document.getElementById('players-container');
        if (!container) return;
        
        container.innerHTML = ''; // Clear existing list
        
        Object.values(this.room.peers).forEach(peer => { // Iterate over values if clientId is not needed here
            const playerEl = document.createElement('div');
            playerEl.className = 'player-item';
            
            const isCurrentUser = peer.id === this.room.clientId;
            const displayName = isCurrentUser ? `${peer.username} (You)` : peer.username;
            
            // Accessing presence data for display (example: coins)
            const playerPresence = this.room.presence[peer.id] || {};
            const playerCoins = playerPresence.coins !== undefined ? playerPresence.coins.toLocaleString() : 'N/A';
            const playerRealMoney = playerPresence.realMoney !== undefined ? playerPresence.realMoney.toLocaleString() : 'N/A';


            playerEl.innerHTML = `
                <img class="player-avatar" src="${peer.avatarUrl}" alt="${peer.username}">
                <div class="player-info">
                    <div class="player-name">${displayName}</div>
                    <div class="player-status">💰 $${playerRealMoney} | 🪙 ${playerCoins} Coins</div>
                </div>
            `;
            // Could add more presence data here like .luck if desired
            
            container.appendChild(playerEl);
        });
    }
    
    showWinNotification(username, amount) {
        if (amount > 100) { // Threshold for "big win" notification
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
                z-index: 10000; /* Ensure it's above popups */
                animation: slideIn 0.5s ease-out;
                box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                font-family: 'Comic Sans MS', cursive; /* Consistent font */
            `;
            
            notification.innerHTML = `🎊 ${username} won ${amount.toLocaleString()} coins! 🎊`;
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.animation = 'slideOut 0.5s ease-in forwards';
                setTimeout(() => notification.remove(), 500);
            }, 4500);
        }
    }
    
    addToFeed(message) {
        // This method is called by game.js now.
        // If multiplayer needs to add its own specific messages, it can call game.addToFeed directly.
        if (window.game && typeof window.game.addToFeed === 'function') {
            window.game.addToFeed(message);
        } else {
            console.warn("game.addToFeed not available for message:", message);
        }
    }
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut { /* Added for notification exit */
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .premium-active {
        background: linear-gradient(45deg, #00ff00, #32cd32) !important;
        color: #000 !important;
        animation: none !important; /* Overrides potential blink/pulse from no-sub */
    }
`;
document.head.appendChild(style);

document.addEventListener('DOMContentLoaded', () => {
    window.multiplayer = new MultiplayerManager();
});