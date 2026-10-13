<?php
// This is the new About Us page
include 'header.php';
?>

<section class="relative bg-gray-900 text-white overflow-hidden">
    <div class="absolute inset-0">
        <svg class="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none"><path fill="rgba(255, 255, 255, 0.03)" d="M0 0 L100 100 L100 0 Z M100 100 L0 0 L0 100 Z"/></svg>
    </div>
    <div class="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
        <h1 class="aos-item text-4xl md:text-5xl font-extrabold tracking-tight mb-4" data-aos="fade-up">
            About <span class="logo-font">VyGo</span>
        </h1>
        <p class="aos-item text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto" data-aos="fade-up" data-aos-delay="100">
            We are revolutionizing bus travel in Sri Lanka, one ticket at a time.
        </p>
    </div>
</section>

<section class="py-16 md:py-24 bg-black">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 prose prose-lg text-gray-300">
        
        <div class="aos-item" data-aos="fade-up">
            <h2 class="text-3xl font-extrabold text-white sm:text-4xl">Our Mission</h2>
            <p>
                Our mission at VyGo is to create a seamless, simple, and reliable platform for all road passengers in Sri Lanka. We aim to connect passengers with both state-run (SLTB) and private bus operators in one user-friendly ecosystem.
            </p>
            
            <h2 class="text-3xl font-extrabold text-white sm:text-4xl mt-12">Powered by <span class="logo-font">Perovin</span></h2>
            <p>
                VyGo is a flagship project by Perovin, a technology company dedicated to solving real-world problems with modern, elegant solutions. We believe in the "If you think it, make it happen" philosophy. VyGo is our commitment to improving public transport infrastructure through smart, data-driven technology.
            </p>

            <h2 class="text-3xl font-extrabold text-white sm:text-4xl mt-12">Our Features</h2>
            <ul>
                <li><strong>Comprehensive Route Search:</strong> Access to thousands of routes across the island.</li>
                <li><strong>Easy Booking:</strong> A simple, secure seat selection and payment process.</li>
                <li><strong>AI Trip Planner:</strong> Get custom itineraries for your destination, powered by the Gemini API.</li>
                <li><strong>User Accounts:</strong> (Coming Soon) Manage all your bookings, save your favorite routes, and track your travel history.</li>
            </ul>
        </div>

    </div>
</section>

<?php
// This includes the footer.php file
include 'footer.php';
?>