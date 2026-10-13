
 // ==========================================================
 // Keyboard and Touch Input
 // ==========================================================

 export function setupInput(canvas, game) {

   // ========================================================
   // Keyboard Controls
   // ========================================================

   document.addEventListener('keydown', (event) => {

     // Space starts, pauses, resumes, or restarts.
     if (event.code === 'Space') {
       event.preventDefault();

       // Ignore key repeat to prevent rapid toggling.
       if (!event.repeat) {
         game.toggleGame();
       }

       return;
     }

     let newDirection;

     switch (event.key.toLowerCase()) {
       case 'arrowup':
       case 'w':
         newDirection = { x: 0, y: -1 };
         break;

       case 'arrowdown':
       case 's':
         newDirection = { x: 0, y: 1 };
         break;

       case 'arrowleft':
       case 'a':
         newDirection = { x: -1, y: 0 };
         break;

       case 'arrowright':
       case 'd':
         newDirection = { x: 1, y: 0 };
         break;

       default:
         return;
     }

     event.preventDefault();
     game.changeDirection(newDirection);
   });

   // ========================================================
   // Touch Controls
   // ========================================================

   let touchStartX = 0;
   let touchStartY = 0;

   const SWIPE_THRESHOLD = 15;

   canvas.addEventListener('touchstart', (event) => {
     const touch = event.changedTouches[0];

     touchStartX = touch.clientX;
     touchStartY = touch.clientY;
   }, { passive: true });

   canvas.addEventListener('touchend', (event) => {
     const touch = event.changedTouches[0];

     const deltaX = touch.clientX - touchStartX;
     const deltaY = touch.clientY - touchStartY;

     const distance = Math.hypot(deltaX, deltaY);

     // Short touch: treat as a tap.
     if (distance < SWIPE_THRESHOLD) {
       game.toggleGame();
       return;
     }

     // Swipe: use the dominant movement direction.
     let newDirection;

     if (Math.abs(deltaX) > Math.abs(deltaY)) {
       newDirection = {
         x: deltaX > 0 ? 1 : -1,
         y: 0
       };
     } else {
       newDirection = {
         x: 0,
         y: deltaY > 0 ? 1 : -1
       };
     }

     game.changeDirection(newDirection);
   });

 }
