<?php
// This includes the header.php file on this page
include 'header.php';

// --- PHP Logic for Bus Search ---
// This block of code will run *before* the HTML is sent to the browser

$search_results = []; // This will hold our bus results
$searched = false; // Flag to know if a search was performed

// Check if the form was submitted using "GET"
if (isset($_GET['from']) && isset($_GET['to']) && isset($_GET['date'])) {
    
    $searched = true; // A search was made
    $from = htmlspecialchars($_GET['from']);
    $to = htmlspecialchars($_GET['to']);
    $date = htmlspecialchars($_GET['date']);

    // --- DATABASE SIMULATION ---
    // In a real app, you would query your MySQL database here.
    // $sql = "SELECT * FROM buses WHERE `from` = ? AND `to` = ? AND departure_date = ?";
    // For this demo, we will create fake data if the route matches.
    
    $all_buses = [
        "Makubura-Monaragala" => [
            ["id" => 1, "route" => "Makubura &rarr; Monaragala", "time" => "06:00 AM", "price" => 1800, "type" => "SLTB"],
            ["id" => 2, "route" => "Makubura &rarr; Monaragala", "time" => "07:30 AM", "price" => 2000, "type" => "Private"],
            ["id" => 3, "route" => "Makubura &rarr; Monaragala", "time" => "09:00 AM", "price" => 1800, "type" => "SLTB"],
        ],
        "Monaragala-Makubura" => [
            ["id" => 4, "route" => "Monaragala &rarr; Makubura", "time" => "08:00 AM", "price" => 1800, "type" => "SLTB"],
            ["id" => 5, "route" => "Monaragala &rarr; Makubura", "time" => "10:30 AM", "price" => 2000, "type" => "Private"],
        ]
    ];

    $search_key = "$from-$to";

    if (array_key_exists($search_key, $all_buses)) {
        $search_results = $all_buses[$search_key];
    }
    // If no match, $search_results remains an empty array.
}

// --- End of PHP Logic ---
?>

<!-- Hero Section with Search Form -->
<section class="relative bg-gray-900 text-white overflow-hidden">
    <div class="absolute inset-0">
        <!-- Subtle background pattern -->
        <svg class="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none"><path fill="rgba(255, 255, 255, 0.03)" d="M0 0 L100 100 L100 0 Z M100 100 L0 0 L0 100 Z"/></svg>
    </div>
    <div class="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 text-center">
        <h1 class="aos-item text-4xl md:text-5xl font-extrabold tracking-tight mb-4" data-aos="fade-up">
            Travel Across Sri Lanka with Ease
        </h1>
        <p class="aos-item text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto mb-10" data-aos="fade-up" data-aos-delay="100">
            Find bus routes, check schedules, and book your tickets instantly.
        </p>

        <!-- 
            Search Form 
            METHOD is "GET" which means the search terms will appear in the URL.
            ACTION is "index.php" which means it submits the form to this same page.
        -->
        <form id="search-form" action="index.php" method="GET" class="aos-item bg-gray-900 text-left max-w-3xl mx-auto p-6 md:p-8 rounded-2xl shadow-2xl" data-aos="fade-up" data-aos-delay="200">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <!-- From -->
                <div>
                    <label for="from" class="block text-sm font-medium text-gray-300">From</label>
                    <div class="mt-1">
                        <input type="text" id="from" name="from" class="block w-full bg-gray-800 border-gray-700 text-white rounded-lg shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm p-3 transition duration-300" placeholder="e.g., Makubura" required value="<?php echo isset($from) ? $from : ''; ?>">
                    </div>
                </div>
                
                <!-- To -->
                <div>
                    <label for="to" class="block text-sm font-medium text-gray-300">To</label>
                    <div class="mt-1">
                        <input type="text" id="to" name="to" class="block w-full bg-gray-800 border-gray-700 text-white rounded-lg shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm p-3 transition duration-300" placeholder="e.g., Monaragala" required value="<?php echo isset($to) ? $to : ''; ?>">
                    </div>
                </div>

                <!-- Date -->
                <div class="md:col-span-2">
                     <label for="date" class="block text-sm font-medium text-gray-300">Date of Journey</label>
                    <div class="mt-1">
                        <input type="date" id="date" name="date" placeholder="Select a Date" class="block w-full bg-gray-800 border-gray-700 text-white rounded-lg shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm p-3 transition duration-300" required value="<?php echo isset($date) ? $date : ''; ?>">
                    </div>
                </div>
            </div>
            
            <!-- Search Button -->
            <div class="mt-6">
                <button type="submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-black bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-300 ease-in-out">
                    Search Buses
                </button>
            </div>
        </form>

    </div>
</section>

<!-- Search Results Section (NEW) -->
<section id="search-results" class="py-16 md:py-24 bg-black">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        <?php if ($searched): // Only show this block if a search was made ?>
            
            <h2 class="text-3xl font-extrabold text-white text-center mb-12 aos-item" data-aos="fade-up">
                Search Results
            </h2>

            <!-- This is the container for PHP-generated results -->
            <div class="aos-item" data-aos="fade-up" data-aos-delay="100">
                <?php if (empty($search_results)): ?>
                    
                    <!-- No Results Found -->
                    <div class="bg-gray-800 border-l-4 border-red-700 text-red-200 p-6 rounded-md shadow text-center">
                        <h3 class="font-bold text-xl">No Buses Found</h3>
                        <p class="mt-2">Sorry, we couldn't find any buses for the route <strong><?php echo $from; ?> &rarr; <?php echo $to; ?></strong> on <strong><?php echo $date; ?></strong>.</p>
                        <p class="text-sm mt-3 text-gray-400">(This is a demo. Try "Makubura" to "Monaragala".)</p>
                    </div>

                <?php else: ?>

                    <!-- Results Found! Loop through them -->
                    <?php foreach ($search_results as $bus): ?>
                        <div class="bus-result-card">
                            <div class="details">
                                <h3 class="text-xl font-bold text-white"><?php echo $bus['route']; ?></h3>
                                <p class="text-gray-300 mt-1">Departure: <span class="font-semibold"><?php echo $bus['time']; ?></span></H3>
                                <p class="text-gray-400 text-sm">Date: <?php echo $date; ?></p>
                            </div>
                            <div class="details text-left md:text-right mt-4 md:mt-0">
                                <span class="text-2xl font-bold text-white">LKR <?php echo $bus['price']; ?>.00</span>
                                <div class="mt-1">
                                    <span class="<?php echo $bus['type'] === 'SLTB' ? 'type-sltb' : 'type-private'; ?>">
                                        <?php echo $bus['type']; ?>
                                    </span>
                                </div>
                            </div>
                            <div class="w-full md:w-auto mt-4 md:mt-0 md:ml-6">
                                <!-- This link passes the Bus ID to the booking page -->
                                <a href="book_seat.php?bus_id=<?php echo $bus['id']; ?>" class="book-button text-center block">
                                    Book Now
                                </a>
                            </div>
                        </div>
                    <?php endforeach; ?>

                    <!-- AI Planner Button (conditionally shown) -->
                    <button type="button" id="plan-trip-btn" class="mt-8 w-full max-w-lg mx-auto flex justify-center items-center py-2 px-4 border border-gray-600 rounded-lg shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-300 ease-in-out">
                        ✨ Plan Your Trip to <?php echo $to; ?> with AI
                    </button>

                <?php endif; ?>
            </div>

        <?php endif; // End of $searched block ?>

    </div>
</section>

<!-- Features Section (Homepage Preview) -->
<section id="features" class="py-16 md:py-24 bg-gray-900">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center aos-item" data-aos="fade-up">
            <h2 class="text-3xl font-extrabold text-white sm:text-4xl">
                A Better Way to Travel
            </h2>
            <p class="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                All the tools you need for a seamless journey.
            </p>
        </div>

        <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-10">
            <!-- Feature 1: AI Planner -->
            <div class="text-center aos-item" data-aos="fade-up" data-aos-delay="0">
                <div class="flex items-center justify-center h-12 w-12 rounded-full bg-gray-800 text-white mx-auto">
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.813 15.904L9 15m0 0l-.813 1.904m.813-1.904L10 14m-1 1.904l1.813-1.904M14 10l.813-1.904M14 10l-.813-1.904m.813 1.904L15 8m-1 1.904l-1.813 1.904m-4.498 6.192l.813-1.904m-.813 1.904L8 20m1-1.904l-1.813-1.904M14 10l-1.813 1.904m4.498-6.192L16 8m1 1.904l1.813 1.904M5 15l.813 1.904M5 15l-.813 1.904m.813-1.904L6 14m-1 1.904l-1.813-1.904M19 15l-.813 1.904M19 15l.813 1.904m-.813-1.904L18 14m1 1.904l1.813-1.904M10 3L9 4m1-1L8 4m2-1L9 2m1 1L8 2m6 1l1 1m-1-1l1-1m-1 1l-1 1m1-1l-1-1M6 5l1-1M6 5l-1-1m1 1L7 4M6 5L7 4m6 13l-1 1m1-1l-1-1m1 1l1 1m-1-1l1-1m-2-5l1-1m-1 1l-1-1m1 1l1 1m-1-1l-1 1"></path></svg>
                </div>
                <div class="mt-5">
                    <h3 class="text-lg leading-6 font-medium text-white">AI Trip Planner</h3>
                    <p class="mt-2 text-base text-gray-400">
                        Use our Gemini-powered AI to plan your entire trip, not just the bus ride.
                    </p>
                </div>
            </div>

            <!-- Feature 2: Easy Seat Selection -->
            <div class="text-center aos-item" data-aos="fade-up" data-aos-delay="100">
                <div class="flex items-center justify-center h-12 w-12 rounded-full bg-gray-800 text-white mx-auto">
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                </div>
                <div class="mt-5">
                    <h3 class="text-lg leading-6 font-medium text-white">Visual Seat Booking</h3>
                    <p class="mt-2 text-base text-gray-400">
                        See the bus layout and pick your exact seat. No more guessing.
                    </p>
                </div>
            </div>

            <!-- Feature 3: SLTB & Private -->
            <div class="text-center aos-item" data-aos="fade-up" data-aos-delay="200">
                <div class="flex items-center justify-center h-12 w-12 rounded-full bg-gray-800 text-white mx-auto">
                    <svg class="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7l4-4m0 0l4 4m-4-4v18" /></svg>
                </div>
                <div class="mt-5">
                    <h3 class="text-lg leading-6 font-medium text-white">SLTB & Private</h3>
                    <p class="mt-2 text-base text-gray-400">
                        We are one of the first platforms to show both SLTB and Private bus options.
                    </p>
                </div>
            </div>
        </div>
        <!-- "See All Features" Button -->
        <div class="text-center mt-16 aos-item" data-aos="fade-up">
            <a href="features.php" class="inline-block bg-white text-black font-medium py-3 px-8 rounded-lg transition duration-300 hover:bg-gray-200">
                See All Features
            </a>
        </div>
    </div>
</section>

<!-- Popular Routes Section (Homepage Preview) -->
<section id="routes" class="py-16 md:py-24 bg-black">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 class="text-3xl font-extrabold text-white text-center mb-12 aos-item" data-aos="fade-up">
            Popular Routes
        </h2>
        <div class="bg-gray-800 shadow-2xl rounded-xl overflow-hidden aos-item" data-aos="fade-up" data-aos-delay="100">
            <ul class="divide-y divide-gray-700">
                <!-- Route 1 -->
                <li class="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-700 transition duration-300">
                    <div>
                        <h3 class="text-lg font-medium text-white">Colombo → Galle</h3>
                        <p class="text-sm text-gray-400">Expressway (E01) • Approx. 2 hours</p>
                    </div>
                    <span class="text-sm font-medium text-gray-500 whitespace-nowrap">
                        View Schedule &rarr;
                    </span>
                </li>
                <!-- Route 2 -->
                <li class="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-700 transition duration-300">
                    <div>
                        <h3 class="text-lg font-medium text-white">Colombo → Kandy</h3>
                        <p class="text-sm text-gray-400">A1 Road • Approx. 3-4 hours</p>
                    </div>
                     <span class="text-sm font-medium text-gray-500 whitespace-nowrap">
                        View Schedule &rarr;
                    </span>
                </li>
                <!-- Route 3 -->
                <li class="flex items-center justify-between p-4 sm:p-6 hover:bg-gray-700 transition duration-300">
                    <div>
                        <h3 class="text-lg font-medium text-white">Colombo → Jaffna</h3>
                        <p class="text-sm text-gray-400">Luxury A/C • Approx. 7-8 hours</p>
                    </div>
                     <span class="text-sm font-medium text-gray-500 whitespace-nowrap">
                        View Schedule &rarr;
                    </span>
                </li>
            </ul>
        </div>
         <!-- "See All Routes" Button -->
        <div class="text-center mt-12 aos-item" data-aos="fade-up">
            <a href="routes.php" class="inline-block text-white font-medium py-3 px-8 rounded-lg transition duration-300 hover:bg-gray-800 border border-gray-700">
                See All Popular Routes
            </a>
        </div>
    </div>
</section>

<?php
// This includes the footer.php file on this page
include 'footer.php';
?>