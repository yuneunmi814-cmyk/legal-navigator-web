// Preserve existing deep links without exposing the server-backed question form by default.
function revealLegacy(){const target=document.getElementById(location.hash.slice(1));const panel=document.getElementById('legacy-guide');if(target&&panel?.contains(target)){panel.open=true;target.scrollIntoView();}}
window.addEventListener('hashchange',revealLegacy);revealLegacy();
