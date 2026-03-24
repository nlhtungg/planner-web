import axios from 'axios';

const getAuthHeader = () => {
    const token = localStorage.getItem('accessToken');
    return { headers: { Authorization: `Bearer ${token}` } };
};

const API_URL = `${import.meta.env.VITE_API_URL || '/api'}/documents`;

const createDocument = async (data) => {
    const response = await axios.post(API_URL, data, getAuthHeader());
    return response.data;
};

const uploadDocument = async (formData) => {
    const token = localStorage.getItem('accessToken');
    const response = await axios.post(API_URL, formData, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

const getWorkspaceDocuments = async (workspaceId) => {
    const response = await axios.get(`${API_URL}/workspace/${workspaceId}`, getAuthHeader());
    return response.data;
};

const getDocument = async (id) => {
    const response = await axios.get(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
};

const updateDocument = async (id, data) => {
    const response = await axios.put(`${API_URL}/${id}`, data, getAuthHeader());
    return response.data;
};

const deleteDocument = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`, getAuthHeader());
    return response.data;
};

const addComment = async (documentId, content) => {
    const response = await axios.post(`${API_URL}/${documentId}/comments`, { content }, getAuthHeader());
    return response.data;
};

const getComments = async (documentId) => {
    const response = await axios.get(`${API_URL}/${documentId}/comments`, getAuthHeader());
    return response.data;
};

const shareDocument = async (documentId, userId, permission) => {
    const response = await axios.post(`${API_URL}/${documentId}/share`, { userId, permission }, getAuthHeader());
    return response.data;
};

const unshareDocument = async (documentId, userId) => {
    const response = await axios.post(`${API_URL}/${documentId}/unshare`, { userId }, getAuthHeader());
    return response.data;
};

const togglePublic = async (documentId) => {
    const response = await axios.post(`${API_URL}/${documentId}/toggle-public`, {}, getAuthHeader());
    return response.data;
};

const documentService = {
    createDocument,
    uploadDocument,
    getWorkspaceDocuments,
    getDocument,
    updateDocument,
    deleteDocument,
    addComment,
    getComments,
    shareDocument,
    unshareDocument,
    togglePublic
};

export default documentService;
