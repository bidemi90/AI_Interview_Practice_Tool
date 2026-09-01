import PropTypes from 'prop-types';

export default function FormError({ error }) {
  if (!error) return null;
  const message = error.response?.data?.error?.message || error.message || 'Something went wrong.';
  return <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{message}</p>;
}

FormError.propTypes = {
  error: PropTypes.shape({
    message: PropTypes.string,
    response: PropTypes.shape({
      data: PropTypes.shape({
        error: PropTypes.shape({ message: PropTypes.string }),
      }),
    }),
  }),
};
