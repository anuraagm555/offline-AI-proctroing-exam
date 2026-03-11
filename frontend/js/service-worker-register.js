// FORCE UNREGISTER OLD SERVICE WORKERS to clear cache issues
// AND DO NOT REGISTER NEW ONES (For Development/Debugging)
if ('serviceWorker' in navigator) {
    // 1. Unregister immediately
    navigator.serviceWorker.getRegistrations().then(function (registrations) {
        for (let registration of registrations) {
            console.log('🛑 Unregistering SW:', registration);
            registration.unregister();
        }
        if (registrations.length > 0) {
            console.log("♻️ Old Service Workers cleared.");
        }
    });

    // 2. DISABLED NEW REGISTRATION
    // window.addEventListener('load', () => {
    //     navigator.serviceWorker.register('/js/service-worker.js')...
    // });
}
