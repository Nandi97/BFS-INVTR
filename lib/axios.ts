import axios, { type AxiosResponse } from 'axios';

const api = axios.create({
	baseURL: '/api',
	headers: { 'Content-Type': 'application/json' },
});

// Explicitly type the success handler so the generic inference chain is preserved
// (un-typed `(res) => res` causes TypeScript to widen T → any for all api.get/post calls)
api.interceptors.response.use(
	<T>(res: AxiosResponse<T>): AxiosResponse<T> => res,
	(err: unknown) => {
		const e = err as {
			response?: { data?: { error?: string } };
			message?: string;
		};
		const message =
			e.response?.data?.error ??
			(e as { message?: string }).message ??
			'Unexpected error';
		return Promise.reject(new Error(message));
	}
);

export default api;
