<?php
// This is the page for booking a seat
include 'header.php';

// Get the bus ID from the URL (e.g., book_seat.php?bus_id=2)
$bus_id = isset($_GET['bus_id']) ? htmlspecialchars($_GET['bus_id']) : 'Unknown';

// --- DATABASE SIMULATION ---
// We'll use the same booked seats as the demo
$booked_seats = ['A4', 'B2', 'D3', 'G1', 'G2', 'K3', 'K4']; 

// Define the bus layout (12 rows of 4 seats = 48 seats)
$rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']; // 12 rows
?>

<section class="py-16 md:py-24 bg-black">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center aos-item" data-aos="fade-up">
            <h2 class="text-3xl font-extrabold text-white sm:text-4xl">
                Select Your Seat
            </h2>
            <p class="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                You are booking for Bus ID: <span class="font-bold text-white"><?php echo $bus_id; ?></span>
            </p>
        </div>

        <!-- NEW 2D Seat Map Container -->
        <div class="seat-map-container mt-12 aos-item" data-aos="fade-up" data-aos-delay="100">
            
            <!-- NEW Bus Body Wrapper -->
            <div class="bus-body">
                
                <!-- NEW Driver's Cab -->
                <div class="driver-cab">
                    <div class="guide-seat">
                        <!-- Guide Seat Icon -->
                        <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div class="driver-seat">
                        <!-- Driver's Wheel Icon -->
                        <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                </div>

                <!-- NEW Seat Grid for 2D layout -->
                <div class="seat-grid">
                    <?php
                    // Loop through each of the 12 rows
                    foreach ($rows as $row_letter) {
                        // Left Side (Seats 1 & 2)
                        $seat_id_1 = $row_letter . '1';
                        $class_1 = 'seat' . (in_array($seat_id_1, $booked_seats) ? ' booked' : '');
                        echo "<div class=\"$class_1\">$seat_id_1</div>";
                        
                        $seat_id_2 = $row_letter . '2';
                        $class_2 = 'seat' . (in_array($seat_id_2, $booked_seats) ? ' booked' : '');
                        echo "<div class=\"$class_2\">$seat_id_2</div>";

                        // Aisle
                        echo '<div class="seat aisle"></div>';

                        // Right Side (Seats 3 & 4)
                        $seat_id_3 = $row_letter . '3';
                        $class_3 = 'seat' . (in_array($seat_id_3, $booked_seats) ? ' booked' : '');
                        echo "<div class=\"$class_3\">$seat_id_3</div>";
                        
                        $seat_id_4 = $row_letter . '4';
                        $class_4 = 'seat' . (in_array($seat_id_4, $booked_seats) ? ' booked' : '');
                        echo "<div class=\"$class_4\">$seat_id_4</div>";
                    }
                    ?>
                </div> <!-- End Seat Grid -->
            </div> <!-- End Bus Body -->

            <!-- Legend (Colors updated to match request) -->
            <div class="seat-legend">
                <div class="legend-item">
                    <div class="seat w-5 h-5"></div>
                    <span class="text-sm ml-2">Available</span>
                </div>
                <div class="legend-item">
                    <div class="seat selected w-5 h-5"></div>
                    <span class="text-sm ml-2">Selected</span>
                </div>
                <div class="legend-item">
                    <div class="seat booked w-5 h-5"></div>
                    <span class="text-sm ml-2">Booked</span>
                </div>
            </div>

            <!-- Booking Button (Unchanged) -->
            <form action="payment.php" method="POST">
                <!-- Hidden input to store selected seats (this is filled by JavaScript) -->
                <input type="hidden" id="selected-seats-input" name="selected_seats" value="">
                <input type="hidden" name="bus_id" value="<?php echo $bus_id; ?>">
                
                <div class="mt-8">
                    <button type="submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-black bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-300 ease-in-out">
                        Confirm Selection
                    </button>
                </div>
            </form>

        </div>

    </div>
</section>

<?php
// This includes the footer.php file
include 'footer.php';
?>