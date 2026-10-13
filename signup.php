<?php
// This is the new Sign Up page
include 'header.php';
?>

<section class="py-16 md:py-24 bg-black">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div class="text-center aos-item" data-aos="fade-up">
            <h2 class="text-3xl font-extrabold text-white sm:text-4xl">
                Create an Account
            </h2>
            <p class="mt-4 text-lg text-gray-400 max-w-2xl mx-auto">
                It's free and only takes a minute.
            </p>
        </div>

        <!-- Sign Up Form Container -->
        <form action="#" method="POST" class="aos-item bg-gray-900 text-left max-w-md mx-auto p-6 md:p-8 rounded-2xl shadow-2xl mt-12" data-aos="fade-up" data-aos-delay="100">
            <div class="grid grid-cols-1 gap-y-6">
                <!-- Name -->
                <div>
                    <label for="name" class="block text-sm font-medium text-gray-300">Full Name</label>
                    <div class="mt-1">
                        <input type="text" id="name" name="name" class="block w-full bg-gray-800 border-gray-700 text-white rounded-lg shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm p-3 transition duration-300" placeholder="e.g., John Doe" required>
                    </div>
                </div>
                
                <!-- Email -->
                <div>
                    <label for="email" class="block text-sm font-medium text-gray-300">Email Address</label>
                    <div class="mt-1">
                        <input type="email" id="email" name="email" class="block w-full bg-gray-800 border-gray-700 text-white rounded-lg shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm p-3 transition duration-300" placeholder="e.g., you@example.com" required>
                    </div>
                </div>

                <!-- Password -->
                <div>
                     <label for="password" class="block text-sm font-medium text-gray-300">Password</label>
                    <div class="mt-1">
                         <input type="password" id="password" name="password" class="block w-full bg-gray-800 border-gray-700 text-white rounded-lg shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm p-3 transition duration-300" placeholder="Create a password" required>
                    </div>
                </div>

                <!-- Confirm Password -->
                <div>
                     <label for="confirm_password" class="block text-sm font-medium text-gray-300">Confirm Password</label>
                    <div class="mt-1">
                         <input type="password" id="confirm_password" name="confirm_password" class="block w-full bg-gray-800 border-gray-700 text-white rounded-lg shadow-sm focus:ring-gray-500 focus:border-gray-500 sm:text-sm p-3 transition duration-300" placeholder="Repeat your password" required>
                    </div>
                </div>
            </div>
            
            <!-- Submit Button -->
            <div class="mt-6">
                <button type="submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-black bg-white hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition duration-300 ease-in-out">
                    Create Account
                </button>
            </div>
            
            <!-- Link to Login -->
            <p class="text-sm text-gray-400 mt-6 text-center">
                Already have an account? 
                <a href="login.php" class="font-medium text-white hover:underline">Login here</a>
            </p>
            <p class="text-xs text-gray-500 mt-4 text-center">(Note: This form is a demo.)</p>
        </form>

    </div>
</section>

<?php
// This includes the footer.php file
include 'footer.php';
?>