*** Settings ***
Documentation    Payment creation, verification, history, and authorization tests.
Resource         ../resources/common.resource
Resource         ../resources/auth.resource
Resource         ../resources/orders.resource
Resource         ../resources/payments.resource
Suite Setup      Setup Payment Suite
Suite Teardown   Stop API Session

*** Keywords ***
Setup Payment Suite
    Start API Session
    Login As Customer
    Login As Creator
    ${order_id}=    Create Accepted Order    ${CUSTOMER_TOKEN}    ${CREATOR_TOKEN}
    Set Suite Variable    ${PAYMENT_ORDER_ID}    ${order_id}

*** Test Cases ***
Create Payment
    ${response}=    Create Payment    ${CUSTOMER_TOKEN}    ${PAYMENT_ORDER_ID}    250
    ${body}=    Response Should Be Success    ${response}
    Should Be Equal    ${body["data"]["payment"]["order_id"]}    ${PAYMENT_ORDER_ID}

Verify Payment
    ${response}=    Verify Payment    ${CUSTOMER_TOKEN}    ${PAYMENT_ID}    SUCCESS
    ${body}=    Response Should Be Success    ${response}
    Should Be Equal    ${body["data"]["payment"]["payment_status"]}    SUCCESS

Payment History
    ${response}=    Payment History    ${CUSTOMER_TOKEN}
    ${body}=    Response Should Be Success    ${response}
    Dictionary Should Contain Key    ${body["data"]}    items

Invalid Payment Verification
    ${payload}=    Create Dictionary    razorpay_payment_id=pay_invalid_${RUN_ID}    status=PENDING
    ${response}=    PATCH API    ${API_PREFIX}/payments/${PAYMENT_ID}/verify    ${payload}    ${CUSTOMER_TOKEN}
    Response Should Be Error    ${response}    400

Unauthorized Payment Access
    ${new_order}=    Create Accepted Order    ${CUSTOMER_TOKEN}    ${CREATOR_TOKEN}
    ${other_email}=    Generate Unique Email    payment.other.customer
    ${other_token}    ${other_refresh}    ${other_user}=    Ensure User And Login    ${other_email}    ${CUSTOMER_PASSWORD}    CUSTOMER    Payment Other Customer
    ${payload}=    Create Dictionary    order_id=${new_order}    amount=${250}    payment_method=card
    ${response}=    POST API    ${API_PREFIX}/payments    ${payload}    ${other_token}
    Response Should Be Error    ${response}    403

