exports.notFound = (req, res) => res.status(404).json({ message: 'Not found.' });

exports.errorHandler = (err, req, res, next) => {
  if (err.name === 'ValidationError') return res.status(400).json({ message: 'Please check the details you entered.' });
  if (err.name === 'CastError') return res.status(404).json({ message: 'Not found.' });
  console.error(err);
  res.status(err.status || 500).json({ message: err.status ? err.message : 'Something went wrong on the server.' });
};
