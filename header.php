<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VyGo - Sri Lanka Bus Management System</title>
    
    <!-- 1. Load Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- 2. Configure Tailwind -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                },
            },
        }
    </script>
    
    <!-- 3. ALL CUSTOM STYLES ARE NOW INCLUDED HERE -->
    <style type="text/tailwindcss">
        /* Custom Logo Font Style */
        .logo-font {
            @apply font-black italic;
            font-family: 'Inter', sans-serif;
            transform: skewX(-10deg);
            display: inline-block;
            letter-spacing: -0.025em;
        }

        /* Dark mode style for the date input placeholder */
        input[type="date"]:before {
            content: attr(placeholder) !important;
            @apply text-gray-500;
        }
        input[type="date"]:focus:before,
        input[type="date"]:valid:before {
            content: "";
        }

        /* Styles for the AI Modal */
        .modal-overlay {
            transition: opacity 0.3s ease;
        }
        .modal-content {
            transition: all 0.3s ease;
        }

        /* Styles for Scroll Animations */
        .aos-item {
            @apply opacity-0 transition-all duration-500;
            transform: translateY(20px);
        }
        .aos-item.is-visible {
            @apply opacity-100;
            transform: translateY(0);
        }

        /* Styles for Bus Search Results (on index.php) */
        .bus-result-card {
            @apply bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl flex flex-wrap md:flex-nowrap justify-between items-center mb-4 transition duration-300 hover:shadow-2xl;
        }
        .bus-result-card .details {
            @apply flex-grow;
        }
        .bus-result-card .type-sltb {
            @apply inline-block bg-red-800 text-white text-xs font-bold px-3 py-1 rounded-full;
        }
        .bus-result-card .type-private {
            @apply inline-block bg-blue-800 text-white text-xs font-bold px-3 py-1 rounded-full;
        }
        .bus-result-card .book-button {
            @apply w-full md:w-auto bg-white text-black font-medium py-2 px-6 rounded-lg transition duration-300 hover:bg-gray-200;
        }

        /* --- STYLES FOR 2D BUS-SHAPED LAYOUT (on book_seat.php) --- */
        .seat-map-container {
            @apply bg-gray-900 p-6 rounded-lg shadow-2xl max-w-sm mx-auto overflow-hidden;
        }
        .bus-body {
            @apply bg-gray-800 border-2 border-gray-700 rounded-lg p-4;
        }
        .driver-cab {
            @apply flex justify-between items-center border-b-2 border-gray-700 pb-4 mb-4;
        }
        .cab-seat {
            @apply w-10 h-10 flex items-center justify-center rounded text-white font-bold;
        }
        .driver-seat {
            @apply bg-orange-600;
        }
        .guide-seat {
            @apply bg-orange-600;
        }
        .seat-grid {
            @apply grid grid-cols-5 gap-x-2 gap-y-3;
        }
        .seat {
            @apply w-full h-10 bg-gray-700 rounded-md flex items-center justify-center text-xs font-medium cursor-pointer transition-all duration-300;
            box-shadow: 0 2px 0 #4a5568;
            opacity: 1;
        }
        .seat.aisle {
            @apply bg-transparent shadow-none cursor-default;
        }
        .seat.booked {
            @apply bg-red-900 text-gray-500 cursor-not-allowed;
            box-shadow: 0 2px 0 #7f1d1d;
        }
        .seat:not(.booked):not(.aisle):hover {
            @apply bg-gray-600;
            transform: translateY(-2px);
        }
        .seat.selected {
            @apply bg-green-500 text-black font-bold ring-2 ring-white;
            box-shadow: 0 2px 0 #15803d;
            transform: translateY(-2px);
        }
        .seat-legend {
            @apply flex justify-center space-x-4 mt-6;
        }
        .legend-item {
            @apply flex items-center space-x-2;
        }

    </style>
</head>
<body class="bg-black text-gray-200 font-sans antialiased">

    <!-- Header -->
    <header class="bg-black shadow-lg sticky top-0 z-50">
        <nav class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                
                <!-- Logo & Main Nav Links -->
                <div class="flex items-center space-x-10">
                    <!-- Logo -->
                    <div class="flex-shrink-0 flex items-center">
                        <a href="index.php" class="text-3xl text-white font-bold"><span class="logo-font">VyGo</span></a>
                    </div>
                    
                    <!-- Desktop Navigation -->
                    <div class="hidden md:block">
                        <div class="flex items-baseline space-x-4">
                            <a href="index.php" class="text-gray-300 hover:bg-gray-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition duration-300">Home</a>
                            <a href="features.php" class="text-gray-300 hover:bg-gray-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition duration-300">Features</a>
                            <a href="routes.php" class="text-gray-300 hover:bg-gray-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition duration-300">Popular Routes</a>
                            <a href="contact.php" class="text-gray-300 hover:bg-gray-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition duration-300">Contact</a>
                            <a href="about.php" class="text-gray-300 hover:bg-gray-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition duration-300">About Us</a>
                        </div>
                    </div>
                </div>
                
                <!-- Login/Signup & Mobile Menu Button (THIS WAS THE BROKEN PART) -->
                <div class="flex items-center">
                    <!-- Login/Signup -->
                    <div class="hidden md:flex items-center space-x-2">
                        <a href="login.php" class="text-gray-300 hover:bg-gray-800 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition duration-300">Login</a>
                        <a href="signup.php" class="text-white bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded-md text-sm font-medium transition duration-300">Sign Up</a>
                    </div>

                    <!-- Mobile Menu Button -->
                    <div class="-mr-2 flex md:hidden ml-4">
                        <button type="button" id="menu-btn" class="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-300" aria-controls="mobile-menu" aria-expanded="false">
                            <span class="sr-only">Open main menu</span>
                            <!-- Hamburger icon -->
                            <svg class="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            <!-- Close icon (hidden by default) -->
                            <svg class="hidden h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </nav>

        <!-- Mobile Menu (hidden by default) -->
        <div class="md:hidden hidden" id="mobile-menu">
            <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <a href="index.php" class="text-gray-300 hover:bg-gray-800 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition duration-300">Home</a>
                <a href="features.php" class="text-gray-300 hover:bg-gray-800 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition duration-300">Features</a>
                <a href="routes.php" class="text-gray-300 hover:bg-gray-800 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition duration-300">Popular Routes</a>
                <a href="contact.php" class="text-gray-300 hover:bg-gray-800 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition duration-300">Contact</a>
                <a href="about.php" class="text-gray-300 hover:bg-gray-800 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition duration-300">About Us</a>
                <hr class="border-gray-700 my-2">
                <a href="login.php" class="text-gray-300 hover:bg-gray-800 hover:text-white block px-3 py-2 rounded-md text-base font-medium transition duration-300">Login</a>
                <a href="signup.php" class="text-white bg-gray-700 hover:bg-gray-600 block px-3 py-2 rounded-md text-base font-medium transition duration-300">Sign Up</a>
            </div>
        </div>
    </header>

    <!-- The <main> tag begins in each page file (index.php, contact.php, etc) -->
    <main>