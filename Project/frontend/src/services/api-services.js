import { api, websocketUrl } from "@/lib/api";
import { unwrap } from "@/lib/utils";

const body = (payload) => payload;
const data = async (request) => unwrap(await request);
const pick = async (request, key) => {
  const payload = await data(request);
  return payload?.[key] ?? payload;
};

export const authService = {
  signup: (payload) => data(api.post("/auth/signup", body(payload))),
  login: (payload) => data(api.post("/auth/login", body(payload))),
  refresh: (refreshToken) => data(api.post("/auth/refresh", { refresh_token: refreshToken })),
  logout: (refreshToken) => data(api.post("/auth/logout", { refresh_token: refreshToken })),
  me: () => pick(api.get("/auth/me"), "user"),
};

export const userService = {
  updateMe: (payload) => pick(api.put("/users/me", body(payload)), "user"),
};

export const creatorService = {
  list: (params) => data(api.get("/creators", { params })),
  details: (id) => pick(api.get(`/creators/${id}`), "creator"),
  myProfile: () => pick(api.get("/creators/profile/me"), "creator"),
  save: (id) => pick(api.post(`/creators/${id}/save`), "saved_creator"),
  saved: () => data(api.get("/creators/saved/me")),
  removeSaved: (id) => data(api.delete(`/creators/saved/${id}`)),
  updateProfile: (payload) => pick(api.put("/creators/profile", body(payload)), "creator"),
};

export const requirementService = {
  list: (params) => data(api.get("/requirements", { params })),
  details: (id) => pick(api.get(`/requirements/${id}`), "requirement"),
  my: () => data(api.get("/requirements/my")),
  create: (payload) => pick(api.post("/requirements", body(payload)), "requirement"),
  update: (id, payload) => pick(api.patch(`/requirements/${id}`, body(payload)), "requirement"),
  remove: (id) => data(api.delete(`/requirements/${id}`)),
  references: (id, payload) => pick(api.post(`/requirements/${id}/references`, body(payload)), "reference"),
  quotations: (id) => data(api.get(`/requirements/${id}/quotations`)),
};

export const quotationService = {
  create: (payload) => pick(api.post("/quotations", body(payload)), "quotation"),
  my: () => data(api.get("/quotations/my")),
  accept: (id) => pick(api.post(`/quotations/${id}/accept`), "order"),
  reject: (id) => pick(api.post(`/quotations/${id}/reject`), "quotation"),
  remove: (id) => data(api.delete(`/quotations/${id}`)),
};

export const adminService = {
  stats: () => pick(api.get("/admin/stats"), "stats"),
  users: () => data(api.get("/admin/users")),
  deleteUser: (id) => data(api.delete(`/admin/users/${id}`)),
  requirements: () => data(api.get("/admin/requirements")),
  deleteRequirement: (id) => data(api.delete(`/admin/requirements/${id}`)),
  quotations: () => data(api.get("/admin/quotations")),
  deleteQuotation: (id) => data(api.delete(`/admin/quotations/${id}`)),
};

export const orderService = {
  list: () => data(api.get("/orders")),
  details: (id) => pick(api.get(`/orders/${id}`), "order"),
  updateStatus: (id, status) => pick(api.patch(`/orders/${id}/status`, { status }), "order"),
  confirmCompletion: (id) => pick(api.post(`/orders/${id}/confirm-completion`), "order"),
  files: (id) => data(api.get(`/orders/${id}/files`)),
  uploadFile: (id, payload) => pick(api.post(`/orders/${id}/files`, body(payload)), "file"),
};

export const contactService = {
  create: (payload) => pick(api.post("/contact", body(payload)), "submission"),
  adminList: (params) => data(api.get("/contact/admin", { params })),
  adminUpdate: (id, payload) => pick(api.patch(`/contact/admin/${id}`, body(payload)), "submission"),
};

export const messageService = {
  byOrder: (orderId) => data(api.get(`/messages/orders/${orderId}`)),
  create: (payload) => pick(api.post("/messages", body(payload)), "message"),
  websocketUrl: (orderId, token) => websocketUrl(`/messages/orders/${orderId}/ws`, { token }),
};

export const uploadService = {
  uploadFile: (file, folder = "uploads") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    return pick(api.post("/uploads/file", formData), "url");
  },
};

export const paymentService = {
  create: (payload) => pick(api.post("/payments/create-order", body(payload)), "payment"),
  verify: (id, payload) => pick(api.post("/payments/verify-payment", body({ payment_id: id, ...payload })), "payment"),
  history: () => data(api.get("/payments/history")),
};

export const reviewService = {
  create: (payload) => pick(api.post("/reviews", body(payload)), "review"),
  byCreator: (id) => data(api.get(`/reviews/creators/${id}`)),
};

export const notificationService = {
  list: () => data(api.get("/notifications")),
  read: (id) => pick(api.patch(`/notifications/${id}/read`), "notification"),
};
