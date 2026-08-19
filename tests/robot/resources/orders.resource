*** Settings ***
Resource    common.resource
Resource    auth.resource
Resource    requirements.resource
Resource    quotations.resource

*** Keywords ***
Create Accepted Order
    [Arguments]    ${customer_token}    ${creator_token}
    ${req_response}=    Create Requirement    ${customer_token}    Robot Order Requirement
    ${req_body}=    Response Should Be Success    ${req_response}
    ${requirement_id}=    Set Variable    ${req_body["data"]["requirement"]["id"]}
    ${quote_response}=    Create Quotation    ${creator_token}    ${requirement_id}    250
    ${quote_body}=    Response Should Be Success    ${quote_response}
    ${quotation_id}=    Set Variable    ${quote_body["data"]["quotation"]["id"]}
    ${order_response}=    Accept Quotation    ${customer_token}    ${quotation_id}
    ${order_body}=    Response Should Be Success    ${order_response}
    ${order_id}=    Set Variable    ${order_body["data"]["order"]["id"]}
    Set Suite Variable    ${ORDER_ID}    ${order_id}
    Set Suite Variable    ${ORDER_REQUIREMENT_ID}    ${requirement_id}
    Set Suite Variable    ${ORDER_QUOTATION_ID}    ${quotation_id}
    RETURN    ${order_id}

List Orders
    [Arguments]    ${token}
    ${response}=    GET API    ${API_PREFIX}/orders    ${token}
    RETURN    ${response}

Get Order
    [Arguments]    ${token}    ${order_id}
    ${response}=    GET API    ${API_PREFIX}/orders/${order_id}    ${token}
    RETURN    ${response}

Update Order Status
    [Arguments]    ${creator_token}    ${order_id}    ${status}
    ${payload}=    Create Dictionary    status=${status}
    ${response}=    PATCH API    ${API_PREFIX}/orders/${order_id}/status    ${payload}    ${creator_token}
    RETURN    ${response}

Upload Order File
    [Arguments]    ${creator_token}    ${order_id}
    ${payload}=    Create Dictionary    file_url=https://example.com/final-file.png    file_type=image/png
    ${response}=    POST API    ${API_PREFIX}/orders/${order_id}/files    ${payload}    ${creator_token}
    RETURN    ${response}

List Order Files
    [Arguments]    ${token}    ${order_id}
    ${response}=    GET API    ${API_PREFIX}/orders/${order_id}/files    ${token}
    RETURN    ${response}

Send Order Message
    [Arguments]    ${token}    ${order_id}    ${message}=Robot order message
    ${payload}=    Create Dictionary    order_id=${order_id}    message=${message}
    ${response}=    POST API    ${API_PREFIX}/messages    ${payload}    ${token}
    RETURN    ${response}

List Order Messages
    [Arguments]    ${token}    ${order_id}
    ${response}=    GET API    ${API_PREFIX}/messages/orders/${order_id}    ${token}
    RETURN    ${response}

