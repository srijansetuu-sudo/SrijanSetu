from fastapi import HTTPException, status


class APIError(HTTPException):
    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST):
        super().__init__(status_code=status_code, detail=message)


class UnauthorizedError(APIError):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message=message, status_code=status.HTTP_401_UNAUTHORIZED)


class ForbiddenError(APIError):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message=message, status_code=status.HTTP_403_FORBIDDEN)


class NotFoundError(APIError):
    def __init__(self, message: str = "Resource not found"):
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND)

