import { toast } from "react-toastify";

const commonOptions = {
  position: "top-right",
  autoClose: 5000,
  hideProgressBar: false,
  closeOnClick: false,
  pauseOnHover: true,
  draggable: false,
  progress: undefined,
  theme: "light",
};

export const Success = (msg) => toast.success(msg, commonOptions);
export const Warning = (msg) => toast.warn(msg, commonOptions);
export const Error = (msg) => toast.error(msg, commonOptions);
export const Info = (msg) => toast.info(msg, commonOptions);
