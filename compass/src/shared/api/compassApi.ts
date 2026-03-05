import axios from 'axios';

const compassApi = axios.create({
  baseURL: '/api/v2/compass',
  headers: {
    'Content-Type': 'application/json',
  },
});

export default compassApi;
