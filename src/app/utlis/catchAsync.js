const catchAsync = (receiveFn) => {
  return (req, res, next) => {
    Promise.resolve(receiveFn(req, res, next)).catch((err) => next(err));
  };
};

export default catchAsync;
