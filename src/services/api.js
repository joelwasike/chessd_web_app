const API_BASE = 'https://api.chessd.games/api';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }

  async request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    return data;
  }

  // Auth
  login(email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  register(username, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  }

  getProfile() {
    return this.request('/auth/profile');
  }

  // Games
  createGame(data) {
    return this.request('/games', { method: 'POST', body: JSON.stringify(data) });
  }

  getGame(id) {
    return this.request(`/games/${id}`);
  }

  getGames(page = 1) {
    return this.request(`/games?page=${page}&page_size=20`);
  }

  getTiers() {
    return this.request('/games/tiers');
  }

  resign(id) {
    return this.request(`/games/${id}/resign`, { method: 'POST' });
  }

  // Wallet
  getBalance() {
    return this.request('/wallet');
  }

  deposit(amount, method, { phone, walletAddress } = {}) {
    const body = { amount, method };
    if (phone) body.phone = phone;
    return this.request('/wallet/deposit', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  withdraw(amount, method, { phone, walletAddress } = {}) {
    const body = { amount, method };
    if (phone) body.phone = phone;
    if (walletAddress) body.wallet_address = walletAddress;
    return this.request('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  getTransactions() {
    return this.request('/wallet/transactions');
  }
}

const api = new ApiService();
export default api;
