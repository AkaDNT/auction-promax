package __PACKAGE_NAME__.adapter.in.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {
    public static final String HEADER_NAME = "X-Correlation-Id";
    public static final String MDC_KEY = "correlationId";
    public static final String REQUEST_ATTRIBUTE_NAME = "correlationId";
    private static final Pattern VALID = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
        FilterChain chain) throws ServletException, IOException {
        String correlationId = resolve(request.getHeader(HEADER_NAME));
        String previous = MDC.get(MDC_KEY);
        request.setAttribute(REQUEST_ATTRIBUTE_NAME, correlationId);
        response.setHeader(HEADER_NAME, correlationId);
        MDC.put(MDC_KEY, correlationId);
        try {
            chain.doFilter(request, response);
        } finally {
            if (previous == null) MDC.remove(MDC_KEY);
            else MDC.put(MDC_KEY, previous);
        }
    }

    private static String resolve(String supplied) {
        return supplied != null && VALID.matcher(supplied).matches() ? supplied : UUID.randomUUID().toString();
    }
}
