// === TIME OF DAY SYSTEM ===
// File: src/systems/time-of-day-system.js
// Manages day/night cycles and lighting conditions

class TimeOfDaySystem {
    constructor() {
        // Time states
        this.timeStates = ['day', 'dusk', 'night', 'dawn'];
        this.currentTimeIndex = 0; // Start with day
        this.transitionDuration = 2000; // 2 seconds for transitions
        this.isTransitioning = false;
        this.transitionStartTime = 0;
        this.transitionProgress = 0;
        
        // Vision range settings for each time of day
        this.visionSettings = {
            day: {
                baseVision: 4,
                forwardVision: 15,
                coneAngle: 160,
                description: 'Bright daylight - excellent visibility'
            },
            dusk: {
                baseVision: 3,
                forwardVision: 12,
                coneAngle: 150,
                description: 'Twilight - vision starting to fade'
            },
            night: {
                baseVision: 2,
                forwardVision: 8,
                coneAngle: 120,
                description: 'Dark night - limited torch-like vision'
            },
            dawn: {
                baseVision: 3,
                forwardVision: 12,
                coneAngle: 150,
                description: 'Early morning - vision improving'
            }
        };
    }
    
    // Get current time of day
    getCurrentTimeOfDay() {
        return this.timeStates[this.currentTimeIndex];
    }
    
    // Get next time of day
    getNextTimeOfDay() {
        const nextIndex = (this.currentTimeIndex + 1) % this.timeStates.length;
        return this.timeStates[nextIndex];
    }
    
    // Advance to next time of day with transition
    advanceTime() {
        if (this.isTransitioning) return false;
        
        this.isTransitioning = true;
        this.transitionStartTime = Date.now();
        this.transitionProgress = 0;
        
        // Start transition to next time
        const nextIndex = (this.currentTimeIndex + 1) % this.timeStates.length;
        const fromTime = this.timeStates[this.currentTimeIndex];
        const toTime = this.timeStates[nextIndex];
        
        console.log(`🌅 Transitioning from ${fromTime} to ${toTime}`);
        
        // Complete transition after duration
        setTimeout(() => {
            this.currentTimeIndex = nextIndex;
            this.isTransitioning = false;
            this.transitionProgress = 1;
            console.log(`🌅 Transition complete - now ${this.getCurrentTimeOfDay()}`);
        }, this.transitionDuration);
        
        return true;
    }
    
    // Set specific time of day (for debugging)
    setTimeOfDay(timeOfDay) {
        const index = this.timeStates.indexOf(timeOfDay);
        if (index === -1) {
            console.warn(`Invalid time of day: ${timeOfDay}`);
            return false;
        }
        
        this.currentTimeIndex = index;
        this.isTransitioning = false;
        this.transitionProgress = 1;
        console.log(`🌅 Time set to ${timeOfDay}`);
        return true;
    }
    
    // Update transition progress
    updateTransition() {
        if (!this.isTransitioning) {
            this.transitionProgress = 1;
            return;
        }
        
        const elapsed = Date.now() - this.transitionStartTime;
        this.transitionProgress = Math.min(1, elapsed / this.transitionDuration);
    }
    
    // Get current lighting conditions for fog system
    getLightingConditions() {
        this.updateTransition();
        
        const currentTime = this.getCurrentTimeOfDay();
        const currentSettings = this.visionSettings[currentTime];
        
        if (!this.isTransitioning) {
            return {
                timeOfDay: currentTime,
                isTransitioning: false,
                transitionProgress: 1,
                lighting: currentTime,
                visionSettings: currentSettings,
                cssTimeClass: `time-${currentTime}`
            };
        }
        
        // During transition, blend between current and next
        const nextTime = this.getNextTimeOfDay();
        const progress = this.transitionProgress;
        
        return {
            timeOfDay: currentTime,
            isTransitioning: true,
            transitionProgress: progress,
            lighting: progress < 0.5 ? currentTime : nextTime,
            visionSettings: currentSettings,
            cssTimeClass: `time-${currentTime}-to-${nextTime}`,
            transitionClass: `transition-${Math.floor(progress * 10)}`
        };
    }
    
    // Get vision settings for current time
    getCurrentVisionSettings() {
        const currentTime = this.getCurrentTimeOfDay();
        return this.visionSettings[currentTime];
    }
    
    // Get status for UI display
    getStatus() {
        const lighting = this.getLightingConditions();
        const settings = this.getCurrentVisionSettings();
        
        return {
            timeOfDay: lighting.timeOfDay,
            isTransitioning: lighting.isTransitioning,
            transitionProgress: lighting.transitionProgress,
            description: settings.description,
            visionRange: `${settings.baseVision}+${settings.forwardVision}`,
            coneAngle: settings.coneAngle
        };
    }
}