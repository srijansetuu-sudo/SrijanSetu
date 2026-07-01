*** Settings ***
Documentation    Quotation marketplace tests.
Resource         ../resources/common.resource
Resource         ../resources/auth.resource
Resource         ../resources/requirements.resource
Resource         ../resources/quotations.resource
Suite Setup      Setup Quotation Suite
Suite Teardown   Stop API Session

*** Keywords ***
Setup Quotation Suite
    Start API Session
    Login As Customer
    Login As Creator
    ${req}=    Create Requirement    ${CUSTOMER_TOKEN}    Robot Quotation Requirement
    ${body}=    Response Should Be Success    ${req}
    Set Suite Variable    ${QUOTE_REQUIREMENT_ID}    ${body["data"]["requirement"]["id"]}

*** Test Cases ***
Creator Sends Quotation
    ${response}=    Create Quotation    ${CREATOR_TOKEN}    ${QUOTE_REQUIREMENT_ID}    275
    ${body}=    Response Should Be Success    ${response}
    Should Be Equal    ${body["data"]["quotation"]["requirement_id"]}    ${QUOTE_REQUIREMENT_ID}

Duplicate Quotation Fails
    ${payload}=    Create Dictionary    requirement_id=${QUOTE_REQUIREMENT_ID}    proposed_price=${300}    estimated_days=${5}    message=Duplicate quote
    ${response}=    POST API    ${API_PREFIX}/quotations    ${payload}    ${CREATOR_TOKEN}
    Response Should Be Error    ${response}    400

Customer Cannot Send Quotation
    ${payload}=    Create Dictionary    requirement_id=${QUOTE_REQUIREMENT_ID}    proposed_price=${250}    estimated_days=${5}    message=Customer quote
    ${response}=    POST API    ${API_PREFIX}/quotations    ${payload}    ${CUSTOMER_TOKEN}
    Response Should Be Error    ${response}    403

Creator Views Own Quotations
    ${response}=    My Quotations    ${CREATOR_TOKEN}
    ${body}=    Response Should Be Success    ${response}
    Dictionary Should Contain Key    ${body["data"]}    items

Customer Views Quotations On Requirement
    ${response}=    List Requirement Quotations    ${CUSTOMER_TOKEN}    ${QUOTE_REQUIREMENT_ID}
    ${body}=    Response Should Be Success    ${response}
    Dictionary Should Contain Key    ${body["data"]}    items

Accepting Quotation Creates Order
    ${response}=    Accept Quotation    ${CUSTOMER_TOKEN}    ${QUOTATION_ID}
    ${body}=    Response Should Be Success    ${response}
    Should Be UUID    ${body["data"]["order"]["id"]}

Customer Rejects Quotation
    ${req}=    Create Requirement    ${CUSTOMER_TOKEN}    Robot Reject Requirement
    ${req_body}=    Response Should Be Success    ${req}
    ${req_id}=    Set Variable    ${req_body["data"]["requirement"]["id"]}
    ${quote}=    Create Quotation    ${CREATOR_TOKEN}    ${req_id}    220
    ${quote_body}=    Response Should Be Success    ${quote}
    ${quote_id}=    Set Variable    ${quote_body["data"]["quotation"]["id"]}
    ${response}=    Reject Quotation    ${CUSTOMER_TOKEN}    ${quote_id}
    ${body}=    Response Should Be Success    ${response}
    Should Be Equal    ${body["data"]["quotation"]["status"]}    REJECTED

Quotation Invalid Requirement Failure
    ${payload}=    Create Dictionary    requirement_id=00000000-0000-0000-0000-000000000000    proposed_price=${250}    estimated_days=${5}    message=Invalid requirement
    ${response}=    POST API    ${API_PREFIX}/quotations    ${payload}    ${CREATOR_TOKEN}
    Response Should Be Error    ${response}    404

