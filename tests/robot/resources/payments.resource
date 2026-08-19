*** Settings ***
Resource    common.resource

*** Keywords ***
Create Payment
    [Arguments]    ${customer_token}    ${order_id}    ${amount}=250
    ${payload}=    Create Dictionary    order_id=${order_id}    amount=${amount}    payment_method=card
    ${response}=    POST API    ${API_PREFIX}/payments    ${payload}    ${customer_token}
    ${body}=    Response Should Be Success    ${response}
    ${payment_id}=    Set Variable    ${body["data"]["payment"]["id"]}
    Set Suite Variable    ${PAYMENT_ID}    ${payment_id}
    RETURN    ${response}

Verify Payment
    [Arguments]    ${customer_token}    ${payment_id}    ${status}=SUCCESS
    ${payload}=    Create Dictionary    razorpay_payment_id=pay_robot_${RUN_ID}    status=${status}
    ${response}=    PATCH API    ${API_PREFIX}/payments/${payment_id}/verify    ${payload}    ${customer_token}
    RETURN    ${response}

Payment History
    [Arguments]    ${token}
    ${response}=    GET API    ${API_PREFIX}/payments/history    ${token}
    RETURN    ${response}

