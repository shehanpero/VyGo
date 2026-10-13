</main>

    <!-- Footer -->
    <footer class="bg-black text-gray-300">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div class="md:flex md:justify-between">
                <div class="mb-8 md:mb-0">
                    <span class="text-3xl text-white font-bold"><span class="logo-font">VyGo</span></span>
                    <p class="mt-2 text-sm text-gray-400">Your partner in Sri Lankan bus travel.</p>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-8">
                    <div>
                        <h4 class="text-sm font-semibold text-gray-100 tracking-wider uppercase">Company</h4>
                        <ul class="mt-4 space-y-2">
                            <!-- UPDATED LINK -->
                            <li><a href="about.php" class="text-base text-gray-300 hover:text-white transition duration-300">About Us</a></li>
                            <li><a href="#" class="text-base text-gray-300 hover:text-white transition duration-300">Careers</a></li>
                            <!-- UPDATED LINK -->
                            <li><a href="contact.php" class="text-base text-gray-300 hover:text-white transition duration-300">Contact</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold text-gray-100 tracking-wider uppercase">Legal</h4>
                        <ul class="mt-4 space-y-2">
                            <li><a href="#" class="text-base text-gray-300 hover:text-white transition duration-300">Privacy Policy</a></li>
                            <li><a href="#" class="text-base text-gray-300 hover:text-white transition duration-300">Terms of Service</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 class="text-sm font-semibold text-gray-100 tracking-wider uppercase">Partners</h4>
                        <ul class="mt-4 space-y-2">
                            <li><a href="#" class="text-base text-gray-300 hover:text-white transition duration-300">NTC</a></li>
                            <li><a href="#" class="text-base text-gray-300 hover:text-white transition duration-300">SLTB</a></li>
                            <li><a href="#" class="text-base text-gray-300 hover:text-white transition duration-300">Bus Operators</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="mt-10 pt-8 border-t border-gray-700 text-center">
                <p class="text-base text-gray-300">&copy; 2025 VyGo. All rights reserved.</p>
                <p class="text-sm mt-2 font-medium text-white">Powered by <span class="logo-font text-lg">Perovin</span></p>
                <p class="text-xs mt-2 text-gray-400">This is a website prototype. It is not a real booking service.</p>
            </div>
        </div>
    </footer>

    <!-- AI Trip Planner Modal -->
    <div id="ai-modal" class="modal-overlay fixed inset-0 w-full h-full bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 hidden opacity-0">
        <div class="modal-content bg-gray-900 text-white w-full max-w-2xl rounded-lg shadow-xl overflow-hidden transform scale-95 opacity-0">
            <!-- Modal Header -->
            <div class="flex justify-between items-center p-4 border-b border-gray-700">
                <h3 class="text-xl font-semibold text-white">✨ Your AI-Powered Trip Plan</h3>
                <button id="modal-close-btn" class="text-gray-500 hover:text-white transition duration-300">
                    <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <!-- Modal Body -->
            <div id="modal-body" class="p-6 max-h-[70vh] overflow-y-auto">
                <div class="text-center">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                    <p class="mt-3 text-gray-400">Generating your custom itinerary...</p>
                </div>
            </div>
        </div>
    </div>


    <!-- JavaScript for Mobile Menu and Form -->
    <script>
        document.addEventListener('DOMContentLoaded', function () {
            // --- Mobile Menu Toggle Logic ---
            const menuBtn = document.getElementById('menu-btn');
            if (menuBtn) {
                const mobileMenu = document.getElementById('mobile-menu');
                const hamburgerIcon = menuBtn.querySelector('svg:first-child');
                const closeIcon = menuBtn.querySelector('svg:last-child');

                menuBtn.addEventListener('click', () => {
                    mobileMenu.classList.toggle('hidden');
                    hamburgerIcon.classList.toggle('hidden');
                    closeIcon.classList.toggle('hidden');
                });
            }

            // --- Form, Modal, and AI Logic (from original index.html) ---
            const searchForm = document.getElementById('search-form');
            const searchMessage = document.getElementById('search-message');
            const dateInput = document.getElementById('date');
            
            // Modal elements
            const modal = document.getElementById('ai-modal');
            const modalBody = document.getElementById('modal-body');
            const modalCloseBtn = document.getElementById('modal-close-btn');

            if (dateInput) {
                // Set min date for date input to today
                const today = new Date().toISOString().split('T')[0];
                dateInput.setAttribute('min', today);
            }

            // --- Modal Functions ---
            function openModal() {
                modal.classList.remove('hidden');
                setTimeout(() => {
                    modal.classList.remove('opacity-0');
                    modal.querySelector('.modal-content').classList.remove('scale-95', 'opacity-0');
                }, 10);
            }

            function closeModal() {
                modal.querySelector('.modal-content').classList.add('scale-95', 'opacity-0');
                modal.classList.add('opacity-0');
                setTimeout(() => {
                    modal.classList.add('hidden');
                    modalBody.innerHTML = `
                        <div class="text-center">
                            <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                            <p class="mt-3 text-gray-400">Generating your custom itinerary...</p>
                        </div>
                    `;
                }, 300);
            }

            if (modalCloseBtn) {
                modalCloseBtn.addEventListener('click', closeModal);
                modal.addEventListener('click', function(e) {
                    if (e.target === modal) {
                        closeModal();
                    }
                });
            }

            // --- AI PLANNER BUTTON (Event delegation for dynamically added button) ---
            // This is different from the original, because the button might be added *after* submit
            document.body.addEventListener('click', function(e) {
                if (e.target && e.target.id == 'plan-trip-btn') {
                    const fromLocation = document.getElementById('from').value;
                    const toLocation = document.getElementById('to').value;
                    const date = document.getElementById('date').value;
                    fetchTripPlan(fromLocation, toLocation, date);
                }
            });

            // --- Gemini API Functions ---
            function formatGeminiResponse(text) {
                let html = text
                    .replace(/\n/g, '<br>')
                    .replace(/\* (.*)/g, '<li class="ml-5 list-disc">$1</li>')
                    .replace(/- (.*)/g, '<li class="ml-5 list-disc">$1</li>');
                
                if (html.includes('<li')) {
                    html = html.replace(/<li/g, '<ul><li').replace(/<\/li>/g, '</li></ul>');
                    html = html.replace(/<\/ul>(\s*<br\s*\/?>\s*)<ul>/g, ''); 
                }
                return `<div class="prose prose-sm max-w-none text-gray-300">${html}</div>`;
            }

            async function fetchTripPlan(from, to, date) {
                openModal(); 
                const systemPrompt = "You are a helpful Sri Lankan travel assistant. The user is planning a bus trip. Provide a concise, exciting, one-day mini-itinerary for their destination. Include 3-4 key sights, a local food suggestion, and one travel tip. Format the answer with bullet points for readability. Do not use markdown headings.";
                const userQuery = `I am traveling by bus from ${from} to ${to} on ${date}. Please give me a one-day itinerary for ${to}.`;
                
                const apiKey = ""; 
                // THIS LINE IS NOW CORRECTED
                const apiUrl = `https://generativelightlanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

                const payload = {
                    contents: [{ parts: [{ text: userQuery }] }],
                    systemInstruction: { parts: [{ text: systemPrompt }] },
                };

                try {
                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (!response.ok) throw new Error(`API Error: ${response.status}`);
                    const result = await response.json();
                    const candidate = result.candidates?.[0];
                    if (candidate && candidate.content?.parts?.[0]?.text) {
                        modalBody.innerHTML = formatGeminiResponse(candidate.content.parts[0].text);
                    } else {
                        throw new Error("Invalid response structure from API.");
                    }
                } catch (error) {
                    console.error("Error fetching trip plan:", error);
                    modalBody.innerHTML = `<div class="bg-red-900 border-l-4 border-red-700 text-red-200 p-4 rounded-md"><h3 class="font-bold">Error</h3><p>Sorry, I couldn't generate a trip plan at this time.</p></div>`;
                }
            }

            // --- Scroll Animation (AOS) Logic ---
            const aosItems = document.querySelectorAll('[data-aos]');
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const delay = entry.target.getAttribute('data-aos-delay') || 0;
                        setTimeout(() => {
                            entry.target.classList.add('is-visible');
                        }, parseInt(delay));
                    }
                });
            }, { threshold: 0.1 });
            aosItems.forEach(item => {
                item.classList.add('aos-item');
                observer.observe(item);
            });

            // --- Seat Selection Logic (for book_seat.php) ---
            const seats = document.querySelectorAll('.seat:not(.booked)');
            let selectedSeats = []; // Keep track of selected seats

            seats.forEach(seat => {
                seat.addEventListener('click', () => {
                    seat.classList.toggle('selected');
                    const seatId = seat.textContent;
                    
                    if (seat.classList.contains('selected')) {
                        // Add to array if not already there
                        if (!selectedSeats.includes(seatId)) {
                            selectedSeats.push(seatId);
                        }
                    } else {
                        // Remove from array
                        selectedSeats = selectedSeats.filter(s => s !== seatId);
                    }
                    
                    // Update the hidden input field
                    const hiddenInput = document.getElementById('selected-seats-input');
                    if(hiddenInput) {
                        hiddenInput.value = selectedSeats.join(',');
                    }
                    console.log('Selected Seats:', selectedSeats.join(','));
                });
            });

        });
    </script>

</body>
</html>