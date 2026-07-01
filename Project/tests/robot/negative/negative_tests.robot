*** Settings ***
Documentation    Centralized negative and security tests.
Resource         ../resources/common.resource
Resource         ../resources/auth.resource
Resource         ../resources/requirements.resource
Resource         ../resources/orders.resource
Suite Setup      Setup Negative Suite
Suite Teardown   Stop API Session

*** Keywords ***
Setup Negative Suite
    Start API Session
    Login As Customer
    Login As Creator
    ${order_id}=    Create Accepted Order    ${CUSTOMER_TOKEN}    ${CREATOR_TOKEN}
    Set Suite Variable    ${NEGATIVE_ORDER_ID}    ${order_id}

*** Test Cases ***
Invalid UUID Returns Validation Error
    ${response}=    GET API    ${API_PREFIX}/requirements/not-a-uuid
    Response Should Be Error    ${response}    422

Missing Request Body Fails
    ${response}=    POST API    ${API_PREFIX}/requirements    ${None}    ${CUSTOMER_TOKEN}
    Response Should Be Error    ${response}    422

Malformed JSON Fails
    ${response}=    Malformed POST API    ${API_PREFIX}/requirements    {"title":
    ...    ${CUSTOMER_TOKEN}
    Response Should Be Error    ${response}    422

Expired Or Invalid JWT Fails
    ${response}=    GET API    ${API_PREFIX}/auth/me    expired.invalid.jwt
    Response Should Be Error    ${response}    401

Wrong Role Access Fails
    ${payload}=    Create Dictionary    title=Wrong Role Requirement    description=Creator cannot create this    budget_min=${100}    budget_max=${500}
    ${response}=    POST API    ${API_PREFIX}/requirements    ${payload}    ${CREATOR_TOKEN}
    Response Should Be Error    ${response}    403

Invalid Enum Value Fails
    ${payload}=    Create Dictionary    status=SHIPPED
    ${response}=    PATCH API    ${API_PREFIX}/orders/${NEGATIVE_ORDER_ID}/status    ${payload}    ${CREATOR_TOKEN}
    Response Should Be Error    ${response}    422

Negative Price Value Fails
    ${payload}=    Create Dictionary    title=Bad Budget    description=Invalid negative budget    budget_min=${-1}    budget_max=${100}
    ${response}=    POST API    ${API_PREFIX}/requirements    ${payload}    ${CUSTOMER_TOKEN}
    Response Should Be Error    ${response}    422

Budget Max Below Min Fails
    ${payload}=    Create Dictionary    title=Bad Budget Range    description=Budget max cannot be below min    budget_min=${500}    budget_max=${100}
    ${response}=    POST API    ${API_PREFIX}/requirements    ${payload}    ${CUSTOMER_TOKEN}
    Response Should Be Error    ${response}    422

Empty Requirement Text Fails
    ${payload}=    Create Dictionary    title=    description=bad    budget_min=${100}    budget_max=${500}
    ${response}=    POST API    ${API_PREFIX}/requirements    ${payload}    ${CUSTOMER_TOKEN}
    Response Should Be Error    ${response}    422

Blank Requirement Reference URL Fails
    ${req}=    Create Requirement    ${CUSTOMER_TOKEN}    Negative Reference Requirement
    ${body}=    Response Should Be Success    ${req}
    ${requirement_id}=    Set Variable    ${body["data"]["requirement"]["id"]}
    ${payload}=    Create Dictionary    image_url=
    ${response}=    POST API    ${API_PREFIX}/requirements/${requirement_id}/references    ${payload}    ${CUSTOMER_TOKEN}
    Response Should Be Error    ${response}    422

Negative Payment Amount Fails
    ${payload}=    Create Dictionary    order_id=${NEGATIVE_ORDER_ID}    amount=${-1}    payment_method=card
    ${response}=    POST API    ${API_PREFIX}/payments    ${payload}    ${CUSTOMER_TOKEN}
    Response Should Be Error    ${response}    422

Invalid Payment Status Enum Fails
    ${payload}=    Create Dictionary    razorpay_payment_id=pay_invalid_status_${RUN_ID}    status=NOT_A_STATUS
    ${response}=    PATCH API    ${API_PREFIX}/payments/00000000-0000-0000-0000-000000000000/verify    ${payload}    ${CUSTOMER_TOKEN}
    Response Should Be Error    ${response}    422

Negative Quotation Price Fails
    ${req}=    Create Requirement    ${CUSTOMER_TOKEN}    Negative Quotation Price Requirement
    ${body}=    Response Should Be Success    ${req}
    ${requirement_id}=    Set Variable    ${body["data"]["requirement"]["id"]}
    ${payload}=    Create Dictionary    requirement_id=${requirement_id}    proposed_price=${-1}    estimated_days=${5}    message=Invalid price
    ${response}=    POST API    ${API_PREFIX}/quotations    ${payload}    ${CREATOR_TOKEN}
    Response Should Be Error    ${response}    422

Invalid Quotation Estimated Days Fails
    ${req}=    Create Requirement    ${CUSTOMER_TOKEN}    Negative Quotation Days Requirement
    ${body}=    Response Should Be Success    ${req}
    ${requirement_id}=    Set Variable    ${body["data"]["requirement"]["id"]}
    ${payload}=    Create Dictionary    requirement_id=${requirement_id}    proposed_price=${250}    estimated_days=${0}    message=Invalid days
    ${response}=    POST API    ${API_PREFIX}/quotations    ${payload}    ${CREATOR_TOKEN}
    Response Should Be Error    ${response}    422

Invalid Review Rating Fails
    ${payload}=    Create Dictionary    order_id=${NEGATIVE_ORDER_ID}    rating=${0}    comment=Invalid low rating
    ${response}=    POST API    ${API_PREFIX}/reviews    ${payload}    ${CUSTOMER_TOKEN}
    Response Should Be Error    ${response}    422
    ${payload}=    Create Dictionary    order_id=${NEGATIVE_ORDER_ID}    rating=${6}    comment=Invalid high rating
    ${response}=    POST API    ${API_PREFIX}/reviews    ${payload}    ${CUSTOMER_TOKEN}
    Response Should Be Error    ${response}    422

Blank Order File Metadata Fails
    ${payload}=    Create Dictionary    file_url=    file_type=
    ${response}=    POST API    ${API_PREFIX}/orders/${NEGATIVE_ORDER_ID}/files    ${payload}    ${CREATOR_TOKEN}
    Response Should Be Error    ${response}    422

Invalid Pagination Params Fail
    ${params}=    Create Dictionary    limit=0    offset=-1
    ${response}=    GET API    ${API_PREFIX}/requirements    params=${params}
    Response Should Be Error    ${response}    422

Unauthorized Resource Ownership Fails
    ${other_email}=    Generate Unique Email    negative.other.customer
    ${other_token}    ${other_refresh}    ${other_user}=    Ensure User And Login    ${other_email}    ${CUSTOMER_PASSWORD}    CUSTOMER    Negative Other Customer
    ${response}=    Get Order    ${other_token}    ${NEGATIVE_ORDER_ID}
    Response Should Be Error    ${response}    403
