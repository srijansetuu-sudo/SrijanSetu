from typing import get_args

from pydantic import BaseModel, ValidationInfo, field_validator


class BlankStringAsNoneModel(BaseModel):
    @field_validator("*", mode="before")
    @classmethod
    def blank_strings_as_none(cls, value, info: ValidationInfo):
        field = cls.model_fields.get(info.field_name)
        allows_none = field is not None and type(None) in get_args(field.annotation)
        if allows_none and isinstance(value, str) and not value.strip():
            return None
        return value
