*** Settings ***
Documentation    Order lifecycle, file, and message tests.
Resource         ../resources/common.resource
Resource         ../resources/auth.resource
Resource         ../resources/orders.resource
Suite Setup      Setup Order Suite
Suite Teardown   Stop API Session

*** Keywords ***
Setup Order Suite
    Start API Session
    Login As Customer
    Login As Creator
    ${order_id}=    Create Accepted Order    ${CUSTOMER_TOKEN}    ${CREATOR_TOKEN}
    Set Suite Variable    ${ORDER_ID}    ${order_id}

*** Test Cases ***
List Orders
    ${response}=    List Orders    ${CUSTOMER_TOKEN}
    ${body}=    Response Should Be Success    ${response}
    Dictionary Should Contain Key    ${body["data"]}    items

Get Order
    ${response}=    Get Order    ${CUSTOMER_TOKEN}    ${ORDER_ID}
    ${body}=    Response Should Be Success    ${response}
    Should Be Equal    ${body["data"]["order"]["id"]}    ${ORDER_ID}

Creator Updates Order Status
    ${response}=    Update Order Status    ${CREATOR_TOKEN}    ${ORDER_ID}    ACTIVE
    ${body}=    Response Should Be Success    ${response}
    Should Be Equal    ${body["data"]["order"]["status"]}    ACTIVE

Customer Cannot Update Restricted Statuses
    ${payload}=    Create Dictionary    status=DELIVERED
    ${response}=    PATCH API    ${API_PREFIX}/orders/${ORDER_ID}/status    ${payload}    ${CUSTOMER_TOKEN}
    Response Should Be Error    ${response}    403

Upload Order File Metadata
    ${response}=    Upload Order File    ${CREATOR_TOKEN}    ${ORDER_ID}
    ${body}=    Response Should Be Success    ${response}
    Should Be Equal    ${body["data"]["file"]["order_id"]}    ${ORDER_ID}

List Order Files
    ${response}=    List Order Files    ${CUSTOMER_TOKEN}    ${ORDER_ID}
    ${body}=    Response Should Be Success    ${response}
    Dictionary Should Contain Key    ${body["data"]}    items

Unauthorized Order Access Failure
    ${other_email}=    Generate Unique Email    order.other.customer
    ${other_token}    ${other_refresh}    ${other_user}=    Ensure User And Login    ${other_email}    ${CUSTOMER_PASSWORD}    CUSTOMER    Order Other Customer
    ${response}=    Get Order    ${other_token}    ${ORDER_ID}
    Response Should Be Error    ${response}    403

Order Chat Messages
    ${send}=    Send Order Message    ${CUSTOMER_TOKEN}    ${ORDER_ID}    Hello creator from Robot
    Response Should Be Success    ${send}
    ${list}=    List Order Messages    ${CREATOR_TOKEN}    ${ORDER_ID}
    ${body}=    Response Should Be Success    ${list}
    Dictionary Should Contain Key    ${body["data"]}    items

