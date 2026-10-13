<?php
// This is the new Features page
include 'header.php';
?>

<!-- Page Header -->
<section class="relative bg-gray-900 text-white overflow-hidden">
    <div class="absolute inset-0">
        <svg class="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none"><path fill="rgba(255, 255, 255, 0.03)" d="M0 0 L100 100 L100 0 Z M100 100 L0 0 L0 100 Z"/></svg>
    </div>
    <div class="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
        <h1 class="aos-item text-4xl md:text-5xl font-extrabold tracking-tight mb-4" data-aos="fade-up">
            Our Features
        </h1>
        <p class="aos-item text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto" data-aos="fade-up" data-aos-delay="100">
            We've built <span class="logo-font">VyGo</span> with modern technology to make your travel simple and predictable.
        </p>
    </div>
</section>

<!-- Features List Section -->
<section class="py-16 md:py-24 bg-black">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            
            <!-- Feature 1: AI Trip Planner -->
            <div class="bg-gray-900 p-8 rounded-2xl shadow-2xl aos-item" data-aos="fade-up">
                <div class="flex items-center justify-center h-12 w-12 rounded-full bg-gray-800 text-white mx-auto">
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.813 15.904L9 15m0 0l-.813 1.904m.813-1.904L10 14m-1 1.904l1.813-1.904M14 10l.813-1.904M14 10l-.813-1.904m.813 1.904L15 8m-1 1.904l-1.813 1.904m-4.498 6.192l.813-1.904m-.813 1.904L8 20m1-1.904l-1.813-1.904M14 10l-1.813 1.904m4.498-6.192L16 8m1 1.904l1.813 1.904M5 15l.813 1.904M5 15l-.813 1.904m.813-1.904L6 14m-1 1.904l-1.813-1.904M19 15l-.813 1.904M19 15l.813 1.904m-.813-1.904L18 14m1 1.904l1.813-1.904M10 3L9 4m1-1L8 4m2-1L9 2m1 1L8 2m6 1l1 1m-1-1l1-1m-1 1l-1 1m1-1l-1-1M6 5l1-1M6 5l-1-1m1 1L7 4M6 5L7 4m6 13l-1 1m1-1l-1-1m1 1l1 1m-1-1l1-1m-2-5l1-1m-1 1l-1-1m1 1l1 1m-1-1l-1 1"></path></svg>
                </div>
                <div class="mt-5 text-center">
                    <h3 class="text-xl leading-6 font-medium text-white">AI Trip Planner</h3>
                    <p class="mt-2 text-base text-gray-400">
                        Powered by the Gemini API, our AI assistant can build a custom one-day itinerary for your destination. Find sights, food, and tips.
                    </p>
                </div>
            </div>

            <!-- Feature 2: Visual Seat Booking -->
            <div class="bg-gray-900 p-8 rounded-2xl shadow-2xl aos-item" data-aos="fade-up" data-aos-delay="100">
                <div class="flex items-center justify-center h-12 w-12 rounded-full bg-gray-800 text-white mx-auto">
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                </div>
                <div class="mt-5 text-center">
                    <h3 class="text-xl leading-6 font-medium text-white">Visual Seat Booking</h3>
                    <p class="mt-2 text-base text-gray-400">
                        See a map of the bus and click the exact seat you want. Aisle, window, front, or back—the choice is yours.
                    </p>
                </div>
            </div>

            <!-- Feature 3: SLTB & Private Buses -->
            <div class="bg-gray-900 p-8 rounded-2xl shadow-2xl aos-item" data-aos="fade-up" data-aos-delay="200">
                <div class="flex items-center justify-center h-12 w-12 rounded-full bg-gray-800 text-white mx-auto">
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7l4-4m0 0l4 4m-4-4v18" /></svg>
                </div>
                <div class="mt-5 text-center">
                    <h3 class="text-xl leading-6 font-medium text-white">SLTB & Private Unified</h3>
                    <p class="mt-2 text-base text-gray-400">
                        Stop searching multiple sites. We bring SLTB (government) and private operator schedules into one simple search result.
                    </p>
                </div>
            </div>

            <!-- Feature 4: User Accounts -->
            <div class="bg-gray-900 p-8 rounded-2xl shadow-2xl aos-item" data-aos="fade-up" data-aos-delay="0">
                <div class="flex items-center justify-center h-12 w-12 rounded-full bg-gray-800 text-white mx-auto">
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div class="mt-5 text-center">
                    <h3 class="text-xl leading-6 font-medium text-white">User Accounts</h3>
                    <p class="mt-2 text-base text-gray-400">
                        Create a free account to view your booking history, manage upcoming trips, and save your payment details for faster checkout.
                    </p>
                </div>
            </div>

            <!-- Feature 5: Real-time Data (Demo) -->
            <div class="bg-gray-900 p-8 rounded-2xl shadow-2xl aos-item" data-aos="fade-up" data-aos-delay="100">
                <div class="flex items-center justify-center h-12 w-12 rounded-full bg-gray-800 text-white mx-auto">
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div class="mt-5 text-center">
                    <h3 class="text-xl leading-6 font-medium text-white">Live Schedules</h3>
                    <p class="mt-2 text-base text-gray-400">
                        Our system is built to connect directly to bus operator APIs, ensuring the schedules you see are always up-to-date. (Currently in demo mode).
                    </p>
                </div>
            </div>

            <!-- Feature 6: Secure Payments (Demo) -->
            <div class="bg-gray-900 p-8 rounded-2xl shadow-2xl aos-item" data-aos="fade-up" data-aos-delay="200">
                <div class="flex items-center justify-center h-12 w-12 rounded-full bg-gray-800 text-white mx-auto">
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
                <div class="mt-5 text-center">
                    <h3 class="text-xl leading-6 font-medium text-white">Secure Payments</h3>
                    <p class="mt-2 text-base text-gray-400">
                        Integration with Sri Lanka's top payment gateways (like PayHere) to ensure your transactions are fast and secure.
                    </p>
                </div>
            </div>

        </div>

    </div>
</section>

<?php
// This includes the footer.php file
include 'footer.php';
?>