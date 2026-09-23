/**
 * Настройки стека, подставляются gulp-ом (build_web) уже ПОСЛЕ сборки rollup.
 * Читаем только через get(), иначе rollup свернёт условия по строке-плейсхолдеру на этапе сборки.
 */
let values = {
    torrserver_domain: '%%TORRSERVER_DOMAIN%%',
    torrserver_domain_two: '%%TORRSERVER_DOMAIN_TWO%%',
    torrserver_login: '%%TORRSERVER_LOGIN%%',
    torrserver_password: '%%TORRSERVER_PASSWORD%%',
    parser_torrent_type: '%%PARSER_TORRENT_TYPE%%',
    parser_url: '%%PARSER_URL%%',
    parser_apikey: '%%PARSER_APIKEY%%'
}

function get(name){
    let value = values[name] || ''

    return value.indexOf('%%') == 0 ? '' : value
}

function url(name){
    let domain = get(name)

    return domain ? 'https://' + domain : ''
}

export default {
    get,
    url
}
