import {
  checkUserRole,
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  updateUserProfile,
} from "./authService";
import {
  addMovie,
  addAdminShowtime,
  deleteAdminShowtime,
  deleteMovie,
  getAdminBookings,
  getAdminDashboardStats,
  updateAdminShowtime,
  updateMovie,
} from "./adminService";
import {
  cancelBooking,
  createBooking,
  expirePendingBookings,
  getBookingById,
  getMyBookings,
} from "./bookingService";
import { getMovieById, getMovies, searchMovies, filterMovies } from "./movieService";
import { getPaymentByBookingId, simulatePayment } from "./paymentService";
import { getSeatsByShowtime, getAvailableSeats, getSeatPrice, calculateBookingTotal } from "./seatService";
import { getShowtimesByMovie } from "./showtimeService";
import { generateTicketQR, getTicketByBookingId } from "./ticketService";
import type { CinebookService } from "./serviceInterface";

export const localCinebookService: CinebookService = {
  auth: {
    register: registerUser,
    login: loginUser,
    logout: logoutUser,
    currentUser: getCurrentUser,
    updateProfile: updateUserProfile,
    checkRole: checkUserRole,
  },
  movies: {
    getMovies,
    getMovieById,
    searchMovies,
    filterMovies,
  },
  showtimes: {
    getShowtimesByMovie,
  },
  seats: {
    getSeatsByShowtime,
    getAvailableSeats,
    getSeatPrice,
    calculateBookingTotal,
  },
  bookings: {
    createBooking,
    getBookingById,
    getMyBookings,
    cancelBooking,
    expirePendingBookings,
  },
  payments: {
    simulatePayment: (id, method, confirmation = {}) => simulatePayment(id, { method, ...confirmation }),
    getPaymentByBookingId,
  },
  tickets: {
    getTicketByBookingId,
    generateTicketQR,
  },
  admin: {
    getDashboardStats: getAdminDashboardStats,
    addMovie,
    updateMovie,
    deleteMovie,
    addShowtime: addAdminShowtime,
    updateShowtime: updateAdminShowtime,
    deleteShowtime: deleteAdminShowtime,
    getAllBookings: getAdminBookings,
    filterBookings: (filters = {}) => getAdminBookings(filters),
  },
};

export default localCinebookService;
