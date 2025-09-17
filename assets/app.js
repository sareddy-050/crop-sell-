(function () {
    function qs(id) { return document.getElementById(id); }
    var API_BASE = 'http://localhost:3000';
    function isJsonResponse(resp) {
        var ct = resp.headers && resp.headers.get && resp.headers.get('content-type');
        return ct && ct.indexOf('application/json') === 0;
    }
    async function toJsonSafe(resp) {
        if (isJsonResponse(resp)) {
            return resp.json();
        }
        var text = await resp.text();
        throw new Error('Server returned non-JSON response. Make sure the server is running at http://localhost:3000.');
    }
    function setAuth(role, username) {
        localStorage.setItem('authRole', role);
        localStorage.setItem('authUser', username);
    }
    function clearAuth() {
        localStorage.removeItem('authRole');
        localStorage.removeItem('authUser');
    }
    function getAuth() {
        return {
            role: localStorage.getItem('authRole'),
            user: localStorage.getItem('authUser')
        };
    }

    async function handleLoginSubmit(event) {
        event.preventDefault();
        var role = qs('role').value;
        var adminName = qs('adminName').value.trim();
        var password = qs('password').value;
        var errorEl = qs('loginError');
        errorEl.textContent = '';

        if (!role) { errorEl.textContent = 'Please select a role.'; return; }
        if (!adminName || !password) { errorEl.textContent = 'Enter admin name and password.'; return; }

        var isSignup = document.body.getAttribute('data-auth-mode') === 'signup';
        var endpoint = isSignup ? (API_BASE + '/api/auth/signup') : (API_BASE + '/api/auth/login');

        var phone = '';
        if (isSignup) {
            var confirmPassword = qs('confirmPassword').value;
            if (password !== confirmPassword) { errorEl.textContent = 'Passwords do not match.'; return; }
            phone = qs('phone').value.trim();
            if (!phone) { errorEl.textContent = 'Phone number is required.'; return; }
        }

        try {
            var res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: role, adminName: adminName, password: password, phone: phone })
            });
            var data = await toJsonSafe(res);
            if (!res.ok) { throw new Error(data && data.error || 'Request failed'); }

            setAuth(role, data.adminName || adminName);
            window.location.href = role === 'customer' ? 'customer.html' : 'farmer.html';
        } catch (e) {
            errorEl.textContent = e.message || 'Something went wrong';
        }
    }

    function guardPage(requiredRole) {
        var auth = getAuth();
        if (!auth.role || auth.role !== requiredRole) {
            window.location.replace('index.html');
            return null;
        }
        return auth;
    }

    function setupLogout(buttonId) {
        var btn = qs(buttonId);
        if (!btn) return;
        btn.addEventListener('click', function () {
            clearAuth();
            window.location.href = 'index.html';
        });
    }

    // Modal functionality
    function showContactModal(name, phone) {
        var modalHtml = 
            '<div class="modal-overlay" id="contactModal">' +
                '<div class="modal">' +
                    '<div class="modal-header">' +
                        '<h3 class="modal-title">Contact Information</h3>' +
                        '<button class="modal-close" id="modalClose">&times;</button>' +
                    '</div>' +
                    '<div class="modal-content">' +
                        '<div class="contact-info">' +
                            '<div class="contact-item">' +
                                '<span class="contact-label">Seller:</span>' +
                                '<span class="contact-value">' + (name || 'N/A') + '</span>' +
                            '</div>' +
                            (phone ? '<div class="contact-item">' +
                                '<span class="contact-label">Phone:</span>' +
                                '<span class="contact-value">' + phone + '</span>' +
                            '</div>' : '') +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>';
        
        // Remove existing modal if any
        var existingModal = document.getElementById('contactModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        var modal = document.getElementById('contactModal');
        var closeBtn = document.getElementById('modalClose');
        
        // Show modal with animation
        setTimeout(function() {
            modal.classList.add('show');
        }, 10);
        
        // Close modal handlers
        function closeModal() {
            modal.classList.remove('show');
            setTimeout(function() {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
        
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Close on escape key
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        });
    }

    function showCropModal(title, contentHtml) {
        var modalHtml =
            '<div class="modal-overlay" id="cropModal">' +
                '<div class="modal">' +
                    '<div class="modal-header">' +
                        '<h3 class="modal-title">' + title + '</h3>' +
                        '<button class="modal-close" id="cropModalClose">&times;</button>' +
                    '</div>' +
                    '<div class="modal-content">' + contentHtml + '</div>' +
                '</div>' +
            '</div>';
        var existingModal = document.getElementById('cropModal');
        if (existingModal) existingModal.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        var modal = document.getElementById('cropModal');
        var closeBtn = document.getElementById('cropModalClose');
        setTimeout(function() { modal.classList.add('show'); }, 10);
        function closeModal() {
            modal.classList.remove('show');
            setTimeout(function() { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 300);
        }
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        });
    }

    function toggleMode() {
        var isSignup = document.body.getAttribute('data-auth-mode') === 'signup';
        var next = isSignup ? 'login' : 'signup';
        document.body.setAttribute('data-auth-mode', next);
        var extra = document.getElementById('signupExtra');
        var btn = document.getElementById('submitBtn');
        var toggle = document.getElementById('toggleMode');
        var phoneRow = document.getElementById('phoneRow');
        if (next === 'signup') {
            if (extra) extra.style.display = '';
            if (btn) btn.textContent = 'Create Account';
            if (toggle) toggle.textContent = 'Have an account? Sign in';
            if (phoneRow) {
                phoneRow.style.display = '';
                var phoneInput = document.getElementById('phone');
                if (phoneInput) {
                    phoneInput.style.display = '';
                    phoneInput.required = true;
                    phoneInput.disabled = false;
                }
            }
        } else {
            if (extra) extra.style.display = 'none';
            if (btn) btn.textContent = 'Sign In';
            if (toggle) toggle.textContent = 'New user? Create an account';
            if (phoneRow) {
                phoneRow.style.display = 'none';
                var phoneInput = document.getElementById('phone');
                if (phoneInput) {
                    phoneInput.style.display = 'none';
                    phoneInput.required = false;
                    phoneInput.disabled = true;
                }
            }
        }
    }
    // On DOMContentLoaded, hide phone field if not in signup mode
    document.addEventListener('DOMContentLoaded', function () {
        var phoneRow = document.getElementById('phoneRow');
        var phoneInput = document.getElementById('phone');
        var isSignup = document.body.getAttribute('data-auth-mode') === 'signup';
        if (phoneRow && phoneInput) {
            if (isSignup) {
                phoneRow.style.display = '';
                phoneInput.style.display = '';
                phoneInput.required = true;
                phoneInput.disabled = false;
            } else {
                phoneRow.style.display = 'none';
                phoneInput.style.display = 'none';
                phoneInput.required = false;
                phoneInput.disabled = true;
            }
        }
    });

    // Add modal for forgot password
    function showForgotPasswordModal() {
        var modalHtml =
            '<div class="modal-overlay" id="forgotPasswordModal">' +
                '<div class="modal">' +
                    '<div class="modal-header">' +
                        '<h3 class="modal-title">Forgot Password</h3>' +
                        '<button class="modal-close" id="forgotPasswordClose">&times;</button>' +
                    '</div>' +
                    '<div class="modal-content">' +
                        '<form id="forgotPasswordForm">' +
                            '<div class="form-row">' +
                                '<label for="forgotRole">Role</label>' +
                                '<select id="forgotRole" required>' +
                                    '<option value="customer">Customer</option>' +
                                    '<option value="farmer">Farmer</option>' +
                                '</select>' +
                            '</div>' +
                            '<div class="form-row">' +
                                '<label for="forgotPhone">Phone Number</label>' +
                                '<input id="forgotPhone" name="forgotPhone" type="tel" required placeholder="+91XXXXXXXXXX" pattern="\\+91[6-9][0-9]{9}" value="+91" oninput="if(!this.value.startsWith(\'+91\'))this.value=\'+91\';">' +
                            '</div>' +
                            '<button type="submit" class="btn primary">Send OTP</button>' +
                            '<p id="forgotPasswordError" class="error" role="alert"></p>' +
                        '</form>' +
                        '<form id="otpForm" style="display:none; margin-top:16px;">' +
                            '<div class="form-row">' +
                                '<label for="otpInput">Enter OTP</label>' +
                                '<input id="otpInput" name="otpInput" type="text" required placeholder="Enter OTP">' +
                            '</div>' +
                            '<div class="form-row">' +
                                '<label for="newPassword">New Password</label>' +
                                '<input id="newPassword" name="newPassword" type="password" required placeholder="New password">' +
                            '</div>' +
                            '<button type="submit" class="btn primary">Reset Password</button>' +
                            '<p id="otpError" class="error" role="alert"></p>' +
                        '</form>' +
                    '</div>' +
                '</div>' +
            '</div>';
        var existingModal = document.getElementById('forgotPasswordModal');
        if (existingModal) existingModal.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        var modal = document.getElementById('forgotPasswordModal');
        var closeBtn = document.getElementById('forgotPasswordClose');
        setTimeout(function() { modal.classList.add('show'); }, 10);
        function closeModal() {
            modal.classList.remove('show');
            setTimeout(function() { if (modal.parentNode) modal.parentNode.removeChild(modal); }, 300);
        }
        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });
        document.addEventListener('keydown', function escapeHandler(e) {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                closeModal();
                document.removeEventListener('keydown', escapeHandler);
            }
        });
        // Handle form logic
        var forgotForm = document.getElementById('forgotPasswordForm');
        var otpForm = document.getElementById('otpForm');
        var forgotError = document.getElementById('forgotPasswordError');
        var otpError = document.getElementById('otpError');
        forgotForm.addEventListener('submit', async function(ev) {
            ev.preventDefault();
            forgotError.textContent = '';
            var role = document.getElementById('forgotRole').value;
            var phone = document.getElementById('forgotPhone').value.trim();
            if (!role || !phone) { forgotError.textContent = 'Please enter all details.'; return; }
            try {
                let resp = await fetch(API_BASE + '/api/auth/request-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role, phone })
                });
                let data = await toJsonSafe(resp);
                if (!resp.ok) { forgotError.textContent = data.error || 'Failed to send OTP'; return; }
                otpForm.style.display = '';
                forgotForm.style.display = 'none';
            } catch (e) {
                forgotError.textContent = e.message || 'Failed to send OTP';
            }
        });
        otpForm.addEventListener('submit', async function(ev) {
            ev.preventDefault();
            otpError.textContent = '';
            var otp = document.getElementById('otpInput').value.trim();
            var newPassword = document.getElementById('newPassword').value;
            var role = document.getElementById('forgotRole').value;
            var phone = document.getElementById('forgotPhone').value.trim();
            if (!otp || !newPassword) { otpError.textContent = 'Please enter OTP and new password.'; return; }
            try {
                let resp = await fetch(API_BASE + '/api/auth/verify-otp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role, phone, otp, newPassword })
                });
                let data = await toJsonSafe(resp);
                if (!resp.ok) { otpError.textContent = data.error || 'Failed to reset password'; return; }
                closeModal();
                alert('Password reset successful! You can now log in with your new password.');
            } catch (e) {
                otpError.textContent = e.message || 'Failed to reset password';
            }
        });
    }
    // Show modal on link click
    document.addEventListener('DOMContentLoaded', function () {
        var forgotLink = document.getElementById('forgotPasswordLink');
        var toggle = document.getElementById('toggleMode');
        function updateForgotLinkVisibility() {
            var isSignup = document.body.getAttribute('data-auth-mode') === 'signup';
            if (forgotLink) forgotLink.style.display = isSignup ? 'none' : '';
        }
        if (forgotLink) {
            forgotLink.addEventListener('click', function(ev) {
                ev.preventDefault();
                showForgotPasswordModal();
            });
        }
        if (toggle) toggle.addEventListener('click', updateForgotLinkVisibility);
        updateForgotLinkVisibility();
    });

    // Page bootstrapping
    document.addEventListener('DOMContentLoaded', function () {
        var loginForm = qs('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLoginSubmit);
            var toggle = document.getElementById('toggleMode');
            if (toggle) toggle.addEventListener('click', toggleMode);
            var googleBtn = document.getElementById('googleBtn');
            if (googleBtn) googleBtn.addEventListener('click', function(){
                var roleSel = document.getElementById('role');
                var role = roleSel && roleSel.value ? roleSel.value : 'customer';
                window.location.href = API_BASE + '/api/google/start?role=' + encodeURIComponent(role);
            });
            return;
        }

        var roleAttr = document.body.getAttribute('data-role');
        if (roleAttr === 'customer') {
            var authC = guardPage('customer');
            if (!authC) return;
            var nameC = document.querySelector('[data-username]');
            if (nameC) nameC.textContent = authC.user || 'Customer';
            setupLogout('logoutBtn');
            // Load all listings for customers
            var cropList = document.getElementById('cropList');
            var filterOrganic = document.getElementById('filterOrganic');
            var filterQuery = document.getElementById('filterQuery');
            var applyFilters = document.getElementById('applyFilters');
            let allCrops = [];
            async function loadCrops() {
                if (!cropList) return;
                cropList.innerHTML = '<p class="muted">Loading...</p>';
                try {
                    var resp = await fetch(API_BASE + '/api/listings');
                    var data = await toJsonSafe(resp);
                    if (!resp.ok) throw new Error(data && data.error || 'Failed to load');
                    allCrops = data.items || [];
                    renderCrops();
                } catch (e) {
                    cropList.innerHTML = '<p class="error">' + (e.message || 'Error') + '</p>';
                }
            }
            function renderCrops() {
                let items = allCrops;
                var q = (filterQuery && filterQuery.value || '').trim().toLowerCase();
                var org = filterOrganic && filterOrganic.value || 'any';
                items = items.filter(function (it) {
                    var okQ = !q || (it.cropType && it.cropType.toLowerCase().indexOf(q) !== -1);
                    var okO = org === 'any' || (org === 'yes' ? it.isOrganic : !it.isOrganic);
                    return okQ && okO;
                });
                if (items.length === 0) { cropList.innerHTML = '<p class="muted">No crops found.</p>'; return; }
                var html = items.map(function (item, idx) {
                    var photos = (item.photos || []).map(function (src) { return '<img src="' + src + '" alt="photo" style="width:60px;height:60px;object-fit:cover;border-radius:8px;margin-right:6px;" />'; }).join('');
                    return (
                        '<div class="crop-item" style="margin-bottom:10px">' +
                        '<div><strong>' + item.cropType + '</strong> — $' + item.pricePerUnit + '/unit ' + (item.isOrganic ? '(Organic)' : '') + '</div>' +
                        '<div class="muted">Seller: ' + (item.farmerName || 'N/A') + '</div>' +
                        '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">' + photos + '</div>' +
                        '<button class="btn" data-crop-idx="' + idx + '">Contact</button>' +
                        '</div>'
                    );
                }).join('');
                cropList.innerHTML = html;
                cropList.querySelectorAll('button[data-crop-idx]').forEach(function(btn){
                    btn.addEventListener('click', function(){
                        var idx = btn.getAttribute('data-crop-idx');
                        var item = items[idx];
                        if (!item) return;
                        // Save crop details to localStorage for the details page
                        localStorage.setItem('selectedCrop', JSON.stringify(item));
                        // Redirect to crop-details.html
                        window.location.href = 'crop-details.html';
                    });
                });
            }
            if (applyFilters) applyFilters.addEventListener('click', function () { renderCrops(); });
            if (filterQuery) filterQuery.addEventListener('keydown', function(e){ if(e.key==='Enter'){ renderCrops(); }});
            loadCrops();
            setInterval(loadCrops, 10000);
        } else if (roleAttr === 'farmer') {
            var authF = guardPage('farmer');
            if (!authF) return;
            var nameF = document.querySelector('[data-username]');
            if (nameF) nameF.textContent = authF.user || 'Farmer';
            setupLogout('logoutBtn');
            // Wire listing form
            var listingForm = document.getElementById('listingForm');
            var listingsEl = document.getElementById('listings');
            var errEl = document.getElementById('listingError');
            async function loadListings() {
                if (!listingsEl) return;
                listingsEl.innerHTML = '<p class="muted">Loading...</p>';
                try {
                    var resp = await fetch(API_BASE + '/api/listings?farmerEmail=' + encodeURIComponent(authF.user || ''));
                    var data = await toJsonSafe(resp);
                    if (!resp.ok) throw new Error(data && data.error || 'Failed to load');
                    if (!data.items || data.items.length === 0) {
                        listingsEl.innerHTML = '<p class="muted">No listings yet.</p>';
                        return;
                    }
                    var html = data.items.map(function (item) {
                        var photos = (item.photos || []).map(function (src) { return '<img src="' + src + '" alt="photo" style="width:80px;height:80px;object-fit:cover;border-radius:8px;margin-right:6px;" />'; }).join('');
                        var videos = (item.videos || []).map(function (src) { return '<video src="' + src + '" controls style="width:140px;border-radius:8px;margin-right:6px;"></video>'; }).join('');
                        return (
                            '<div class="panel" style="margin-bottom:10px">' +
                            '<div><strong>' + item.cropType + '</strong> — $' + item.pricePerUnit + '/unit ' + (item.isOrganic ? '(Organic)' : '') + '</div>' +
                            '<div class="muted">Contact: ' + item.contactNumber + ' • Address: ' + item.customerAddress + '</div>' +
                            '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">' + photos + videos + '</div>' +
                            '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">' +
                                '<button class="btn" data-edit-id="' + item.id + '">Edit</button>' +
                                '<button class="btn" data-delete-id="' + item.id + '">Delete</button>' +
                            '</div>' +
                            '</div>'
                        );
                    }).join('');
                    listingsEl.innerHTML = html;
                    // Wire edit/delete
                    listingsEl.querySelectorAll('button[data-delete-id]').forEach(function(btn){
                        btn.addEventListener('click', async function(){
                            var id = btn.getAttribute('data-delete-id');
                            if (!id) return;
                            if (!confirm('Delete this listing?')) return;
                            try {
                                var resp = await fetch(API_BASE + '/api/listings/' + encodeURIComponent(id) + '?owner=' + encodeURIComponent(authF.user || ''), {
                                    method: 'DELETE',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ farmerEmail: authF.user || '' })
                                });
                                var dataDel = await toJsonSafe(resp);
                                if (!resp.ok) throw new Error(dataDel && dataDel.error || 'Failed to delete');
                                await loadListings();
                            } catch(e) { alert(e.message || 'Error'); }
                        });
                    });
                    listingsEl.querySelectorAll('button[data-edit-id]').forEach(function(btn){
                        btn.addEventListener('click', async function(){
                            var id = btn.getAttribute('data-edit-id');
                            if (!id) return;
                            // Fetch the current listing data
                            var item = null;
                            try {
                                var resp = await fetch(API_BASE + '/api/listings?farmerEmail=' + encodeURIComponent(authF.user || ''));
                                var data = await toJsonSafe(resp);
                                if (resp.ok && data.items) {
                                    item = data.items.find(function(it){ return String(it.id) === String(id); });
                                }
                            } catch (e) {}
                            if (!item) { alert('Could not load listing data.'); return; }
                            // Save listing data to localStorage and redirect to edit-listing.html
                            localStorage.setItem('editListing', JSON.stringify(item));
                            window.location.href = 'edit-listing.html';
                        });
                    });
                } catch (e) {
                    listingsEl.innerHTML = '<p class="error">' + (e.message || 'Error') + '</p>';
                }
            }

            if (listingForm) {
                listingForm.addEventListener('submit', async function (ev) {
                    ev.preventDefault();
                    if (errEl) errEl.textContent = '';
                    var fd = new FormData(listingForm);
                    fd.append('farmerEmail', authF.user || '');
                    try {
                        var resp2 = await fetch(API_BASE + '/api/listings', { method: 'POST', body: fd });
                        var data2 = await toJsonSafe(resp2);
                        if (!resp2.ok) throw new Error(data2 && data2.error || 'Failed to publish');
                        listingForm.reset();
                        await loadListings();
                    } catch (e) {
                        if (errEl) errEl.textContent = e.message || 'Error';
                    }
                });
            }
            loadListings();
        }
    });
})();


