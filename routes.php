<?php
// This is the new Popular Routes page
include 'header.php';
?>

<!-- Page Header -->
<section class="relative bg-gray-900 text-white overflow-hidden">
    <div class="absolute inset-0">
        <svg class="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none"><path fill="rgba(255, 255, 255, 0.03)" d="M0 0 L100 100 L100 0 Z M100 100 L0 0 L0 100 Z"/></svg>
    </div>
    <div class="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
        <h1 class="aos-item text-4xl md:text-5xl font-extrabold tracking-tight mb-4" data-aos="fade-up">
            Popular Bus Routes
        </h1>
        <p class="aos-item text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto" data-aos="fade-up" data-aos-delay="100">
            Find schedules for the most traveled routes across Sri Lanka, from Expressway to A-Grade roads.
        </p>
    </div>
</section>

<!-- Routes List Section -->
<section class="py-16 md:py-24 bg-black">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="bg-gray-800 shadow-2xl rounded-xl overflow-hidden aos-item" data-aos="fade-up" data-aos-delay="100">
            <ul class="divide-y divide-gray-700">
                
                <!-- Route 1 -->
                <li class="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-700 transition duration-300">
                    <div>
                        <h3 class="text-lg font-medium text-white">Colombo → Galle</h3>
                        <p class="text-sm text-gray-400">Expressway (E01) • Approx. 2 hours</p>
                    </div>
                    <a href="index.php?from=Colombo&to=Galle&date=<?php echo date('Y-m-d'); ?>" class="book-button text-sm !py-2 !px-4 text-center">
                        Search
                    </a>
                </li>
                
                <!-- Route 2 -->
                <li class="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-700 transition duration-300">
                    <div>
                        <h3 class="text-lg font-medium text-white">Colombo → Kandy</h3>
                        <p class="text-sm text-gray-400">A1 Road • Approx. 3-4 hours</p>
                    </div>
                    <a href="index.php?from=Colombo&to=Kandy&date=<?php echo date('Y-m-d'); ?>" class="book-button text-sm !py-2 !px-4 text-center">
                        Search
                    </a>
                </li>

                <!-- Route 3 -->
                <li class="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-700 transition duration-300">
                    <div>
                        <h3 class="text-lg font-medium text-white">Colombo → Jaffna</h3>
                        <p class="text-sm text-gray-400">Luxury A/C • Approx. 7-8 hours</p>
                    </div>
                    <a href="index.php?from=Colombo&to=Jaffna&date=<?php echo date('Y-m-d'); ?>" class="book-button text-sm !py-2 !px-4 text-center">
                        Search
                    </a>
                </li>

                <!-- Route 4 -->
                <li class="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-700 transition duration-300">
                    <div>
                        <h3 class="text-lg font-medium text-white">Colombo → Matara</h3>
                        <p class="text-sm text-gray-400">Expressway (E01) • Approx. 2.5 hours</p>
                    </div>
                    <a href="index.php?from=Colombo&to=Matara&date=<?php echo date('Y-m-d'); ?>" class="book-button text-sm !py-2 !px-4 text-center">
                        Search
                    </a>
                </li>

                <!-- Route 5 -->
                <li class="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-700 transition duration-300">
                    <div>
                        <h3 class="text-lg font-medium text-white">Makubura → Monaragala</h3>
                        <p class="text-sm text-gray-400">Expressway (E01) • Approx. 4 hours</p>
                    </div>
                    <a href="index.php?from=Makubura&to=Monaragala&date=<?php echo date('Y-m-d'); ?>" class="book-button text-sm !py-2 !px-4 text-center">
                        Search
                    </a>
                </li>

                <!-- Route 6 -->
                <li class="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-700 transition duration-300">
                    <div>
                        <h3 class="text-lg font-medium text-white">Colombo → Anuradhapura</h3>
                        <p class="text-sm text-gray-400">A/C Intercity • Approx. 5-6 hours</p>
                    </div>
                    <a href="index.php?from=Colombo&to=Anuradhapura&date=<?php echo date('Y-m-d'); ?>" class="book-button text-sm !py-2 !px-4 text-center">
                        Search
                    </a>
                </li>

                <!-- Route 7 -->
                <li class="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-700 transition duration-300">
                    <div>
                        <h3 class="text-lg font-medium text-white">Kandy → Nuwara Eliya</h3>
                        <p class="text-sm text-gray-400">Scenic Route • Approx. 2.5 hours</p>
                    </div>
                    <a href="index.php?from=Kandy&to=Nuwara Eliya&date=<?php echo date('Y-m-d'); ?>" class="book-button text-sm !py-2 !px-4 text-center">
                        Search
                    </a>
                </li>

            </ul>
        </div>
    </div>
</section>

<?php
// This includes the footer.php file
include 'footer.php';
?>